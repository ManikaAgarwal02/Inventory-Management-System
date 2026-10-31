const mongoose = require("mongoose")
const Product = require("../../Models/ProductSchema/product")
const Category = require("../../Models/CategorySchema/category")
const Supplier = require("../../Models/SupplierSchema/supplier")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")
const logActivity = require("../../Configuration Folders/activityLogger")
const { getDefaultWarehouse, addToWarehouse } = require("../../Configuration Folders/warehouseStock")

const MAX_ROWS = 2000
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const blank = (v) => v === undefined || v === null || String(v).trim() === ""

// Validates every row. Rows are plain objects: name, sku, category, supplier, quantity, price, reorderLevel, unit (+ optional rowNumber).
// Returns one result per row: { row, data?, errors[] }  (row = spreadsheet row number, header is row 1)
async function validateRows(rows) {
    const [categories, suppliers, existing] = await Promise.all([
        Category.find().lean(), Supplier.find().lean(),
        Product.find().select("sku").lean()
    ])
    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]))
    const supMap = new Map(suppliers.map((s) => [s.name.toLowerCase(), s]))
    const existingSkus = new Set(existing.map((p) => p.sku))
    const seenSkus = new Map() // sku -> first row number in this file

    return rows.map((raw, i) => {
        const rowNo = Number.isInteger(raw.rowNumber) ? raw.rowNumber : i + 2
        const errors = []
        const name = String(raw.name ?? "").trim()
        const sku = String(raw.sku ?? "").trim().toUpperCase()

        const allBlank = ["name", "sku", "category", "supplier", "quantity", "price", "reorderLevel"].every((k) => blank(raw[k]))
        if (allBlank) errors.push("Row is empty")
        else if (!name) errors.push("Product name is required")
        else if (name.length > 150) errors.push("Product name is too long")
        if (!sku) { if (!allBlank) errors.push("SKU is required") }
        else if (existingSkus.has(sku)) errors.push(`SKU ${sku} already exists in inventory`)
        else if (seenSkus.has(sku)) errors.push(`Duplicate SKU in file (first used on row ${seenSkus.get(sku)})`)
        if (sku && !seenSkus.has(sku)) seenSkus.set(sku, rowNo)

        let price = 0
        if (!blank(raw.price)) {
            price = Number(String(raw.price).replace(/[₹,\s]/g, ""))
            if (!Number.isFinite(price) || price < 0) { errors.push("Price must be a number, 0 or more"); price = 0 }
        }
        let quantity = 0
        if (!blank(raw.quantity)) {
            quantity = Number(String(raw.quantity).replace(/,/g, ""))
            if (!Number.isInteger(quantity) || quantity < 0) { errors.push("Quantity must be a whole number, 0 or more"); quantity = 0 }
        }
        let reorderLevel = 10
        if (!blank(raw.reorderLevel)) {
            reorderLevel = Number(raw.reorderLevel)
            if (!Number.isInteger(reorderLevel) || reorderLevel < 0) { errors.push("Minimum stock level must be a whole number, 0 or more"); reorderLevel = 10 }
        }

        const categoryName = String(raw.category ?? "").trim()
        const supplierName = String(raw.supplier ?? "").trim()
        let supplier = null
        if (supplierName) {
            supplier = supMap.get(supplierName.toLowerCase())
            if (!supplier) errors.push(`Supplier "${supplierName}" does not exist`)
        }

        return {
            row: rowNo,
            errors,
            data: { name, sku, price, quantity, reorderLevel, unit: String(raw.unit ?? "").trim() || "pcs", categoryName, supplier: supplier ? supplier._id : null },
            isNewCategory: !!categoryName && !catMap.has(categoryName.toLowerCase())
        }
    })
}

function readRows(body) {
    if (!Array.isArray(body.rows)) return { error: "No rows were sent" }
    if (body.rows.length === 0) return { error: "The file has no data rows" }
    if (body.rows.length > MAX_ROWS) return { error: `Too many rows. Import up to ${MAX_ROWS} products at a time` }
    if (body.rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))) return { error: "Invalid row data" }
    return { rows: body.rows }
}

const previewImport = async (req, res) => {
    try {
        const { error, rows } = readRows(req.body)
        if (error) return res.status(400).json({ message: error })
        const results = await validateRows(rows)
        const valid = results.filter((r) => r.errors.length === 0).length
        res.json({
            message: "Import Preview Ready",
            data: { total: results.length, valid, invalid: results.length - valid, rows: results.map(({ row, errors, data, isNewCategory }) => ({ row, errors, data, isNewCategory })) }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to validate the file" })
    }
}

const commitImport = async (req, res) => {
    try {
        const { error, rows } = readRows(req.body)
        if (error) return res.status(400).json({ message: error })
        const results = await validateRows(rows)
        const warehouse = await getDefaultWarehouse()

        // resolve / create categories once
        const catCache = new Map()
        async function categoryId(name) {
            if (!name) return null
            const key = name.toLowerCase()
            if (catCache.has(key)) return catCache.get(key)
            let cat = await Category.findOne({ name: new RegExp(`^${escapeRe(name)}$`, "i") })
            if (!cat) {
                try { cat = await Category.create({ name }) } catch (e) {
                    if (e.code !== 11000) throw e
                    cat = await Category.findOne({ name: new RegExp(`^${escapeRe(name)}$`, "i") })
                }
            }
            catCache.set(key, cat._id)
            return cat._id
        }

        let imported = 0
        const failed = []
        for (const r of results) {
            if (r.errors.length) { failed.push({ row: r.row, sku: r.data.sku, errors: r.errors }); continue }
            try {
                const { categoryName, ...fields } = r.data
                const product = await Product.create({ ...fields, category: await categoryId(categoryName) })
                if (product.quantity > 0) {
                    await addToWarehouse(product._id, warehouse._id, product.quantity)
                    await StockTransaction.create({
                        product: product._id, type: "IN", quantity: product.quantity, reason: "import",
                        note: "Opening stock (CSV import)", warehouse: warehouse._id, performedBy: req.user.id
                    })
                }
                imported++
            } catch (e) {
                failed.push({ row: r.row, sku: r.data.sku, errors: [e.code === 11000 ? `SKU ${r.data.sku} already exists in inventory` : "Could not be saved"] })
            }
        }

        logActivity(req, "product.import", "product", "", `CSV import: ${imported} imported, ${failed.length} failed`)
        res.status(imported > 0 ? 201 : 200).json({ message: "Import Finished", data: { total: results.length, imported, failed } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to import products" })
    }
}

module.exports = { previewImport, commitImport }
void mongoose
