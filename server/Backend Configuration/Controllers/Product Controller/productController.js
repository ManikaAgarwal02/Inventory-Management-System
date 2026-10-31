const mongoose = require("mongoose")
const Product = require("../../Models/ProductSchema/product")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")
const Category = require("../../Models/CategorySchema/category")
const Supplier = require("../../Models/SupplierSchema/supplier")
const logActivity = require("../../Configuration Folders/activityLogger")
const WarehouseStock = require("../../Models/WarehouseStockSchema/warehouseStock")
const { getDefaultWarehouse, reconcileProduct, addToWarehouse, removeFromAnyWarehouse } = require("../../Configuration Folders/warehouseStock")

function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === ""
}

// Validates and cleans the fields sent from the product form.
// Returns { error } or { data }.
// quantityOptional: on edit, a missing quantity means "leave stock as it is"
function cleanProductInput(body, { quantityOptional = false } = {}) {
    const name = String(body.name || "").trim()
    const sku = String(body.sku || "").trim().toUpperCase()
    const price = Number(body.price)
    const quantity = Number(body.quantity)
    const reorderLevel = Number(body.reorderLevel)

    if (!name) return { error: "Product name is required" }
    if (!sku) return { error: "SKU is required" }
    if (isBlank(body.price) || !Number.isFinite(price) || price < 0) return { error: "Price must be 0 or more" }
    const skipQuantity = quantityOptional && isBlank(body.quantity)
    if (!skipQuantity && (isBlank(body.quantity) || !Number.isInteger(quantity) || quantity < 0)) return { error: "Quantity must be a whole number, 0 or more" }
    if (isBlank(body.reorderLevel) || !Number.isInteger(reorderLevel) || reorderLevel < 0) return { error: "Reorder level must be a whole number, 0 or more" }
    if (body.category && !mongoose.isValidObjectId(body.category)) return { error: "Invalid category" }
    if (body.supplier && !mongoose.isValidObjectId(body.supplier)) return { error: "Invalid supplier" }

    return {
        data: {
            name,
            sku,
            price,
            ...(skipQuantity ? {} : { quantity }),
            reorderLevel,
            unit: String(body.unit || "pcs").trim() || "pcs",
            category: body.category || null,
            supplier: body.supplier || null
        }
    }
}

// category / supplier must point at records that exist
async function checkReferences(data) {
    if (data.category && !(await Category.exists({ _id: data.category }))) return "Selected category does not exist"
    if (data.supplier && !(await Supplier.exists({ _id: data.supplier }))) return "Selected supplier does not exist"
    return null
}

const createProduct = async (req, res) => {
    try {
        const { error, data } = cleanProductInput(req.body)
        if (error) return res.status(400).json({ message: error })

        const refError = await checkReferences(data)
        if (refError) return res.status(400).json({ message: refError })

        const existing = await Product.findOne({ sku: data.sku })
        if (existing) {
            return res.status(400).json({ message: "SKU Already Exists" })
        }

        const product = await Product.create(data)

        // opening stock goes through the ledger so history always adds up to the quantity
        if (product.quantity > 0) {
            try {
                await addToWarehouse(product._id, (await getDefaultWarehouse())._id, product.quantity)
                await StockTransaction.create({
                    product: product._id,
                    type: "IN",
                    quantity: product.quantity,
                    note: "Opening stock",
                    reason: "opening",
                    performedBy: req.user ? req.user.id : undefined
                })
            } catch (ledgerError) {
                console.log("Opening-stock ledger entry failed:", ledgerError.message)
            }
        }

        logActivity(req, "product.create", "product", product._id, `Added ${product.name} (${product.sku})`)
        res.status(201).json({ message: "Product Created Successfully", data: product })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "SKU Already Exists" })
        }
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate("category", "name")
            .populate("supplier", "name")
            .sort({ createdAt: -1 })

        res.json({ message: "Products Fetched Successfully", data: products })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }

        const product = await Product.findById(req.params.id)
            .populate("category", "name")
            .populate("supplier", "name")

        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        res.json({ message: "Product Fetched Successfully", data: product })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const updateProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }

        const { error, data } = cleanProductInput(req.body, { quantityOptional: true })
        if (error) return res.status(400).json({ message: error })

        const refError = await checkReferences(data)
        if (refError) return res.status(400).json({ message: refError })

        const duplicate = await Product.findOne({ sku: data.sku, _id: { $ne: req.params.id } })
        if (duplicate) {
            return res.status(400).json({ message: "SKU Already Exists" })
        }

        const existing = await Product.findById(req.params.id).select("quantity")
        if (!existing) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        // A quantity change made from the edit form is applied as a delta (so it can't
        // silently overwrite a concurrent stock movement) and recorded in the ledger.
        const { quantity: requestedQuantity, ...fields } = data
        const newQuantity = requestedQuantity === undefined ? existing.quantity : requestedQuantity
        const delta = newQuantity - existing.quantity
        const filter = { _id: req.params.id }
        if (delta < 0) filter.quantity = { $gte: -delta }

        // keep the per-warehouse numbers in step with the new total
        if (delta !== 0) await reconcileProduct(req.params.id)
        if (delta < 0 && !(await removeFromAnyWarehouse(req.params.id, -delta))) {
            return res.status(409).json({ message: "Stock changed while you were editing. Please reload and try again." })
        }

        const product = await Product.findOneAndUpdate(
            filter,
            { $set: fields, $inc: { quantity: delta } },
            { new: true, runValidators: true }
        )
        if (!product) {
            if (delta < 0) await addToWarehouse(req.params.id, (await getDefaultWarehouse())._id, -delta)
            return res.status(409).json({ message: "Stock changed while you were editing. Please reload and try again." })
        }
        if (delta > 0) await addToWarehouse(product._id, (await getDefaultWarehouse())._id, delta)

        if (delta !== 0) {
            try {
                await StockTransaction.create({
                    product: product._id,
                    type: delta > 0 ? "IN" : "OUT",
                    quantity: Math.abs(delta),
                    note: `Manual adjustment (product edit): ${existing.quantity} → ${newQuantity}`,
                    reason: "adjustment",
                    performedBy: req.user ? req.user.id : undefined
                })
            } catch (ledgerError) {
                console.log("Adjustment ledger entry failed:", ledgerError.message)
            }
        }

        logActivity(req, "product.update", "product", product._id, `Updated ${product.name} (${product.sku})`)
        res.json({ message: "Product Updated Successfully", data: product })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "SKU Already Exists" })
        }
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id)
        if (!product) {
            return res.status(404).json({ success: false, message: "Product Not Found" })
        }
        await WarehouseStock.deleteMany({ product: product._id })
        logActivity(req, "product.delete", "product", product._id, `Deleted ${product.name} (${product.sku})`)
        res.json({ success: true, message: "Product Has Been Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

const getLowStockProducts = async (req, res) => {
    try {
        // compare two fields of the same document, so let the database do it
        const lowStock = await Product.find({ $expr: { $lte: ["$quantity", "$reorderLevel"] } })
            .populate("category", "name")
            .populate("supplier", "name")
            .sort({ quantity: 1 })

        res.json({ message: "Low Stock Products Fetched Successfully", data: lowStock })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts
}
