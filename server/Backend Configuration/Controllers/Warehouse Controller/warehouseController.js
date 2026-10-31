const mongoose = require("mongoose")
const Warehouse = require("../../Models/WarehouseSchema/warehouse")
const WarehouseStock = require("../../Models/WarehouseStockSchema/warehouseStock")
const StockTransfer = require("../../Models/StockTransferSchema/stockTransfer")
const Product = require("../../Models/ProductSchema/product")
const logActivity = require("../../Configuration Folders/activityLogger")
const { reconcileStock, reconcileProduct, addToWarehouse, removeFromWarehouse } = require("../../Configuration Folders/warehouseStock")

function cleanWarehouse(body) {
    const name = String(body.name || "").trim()
    if (!name) return { error: "Warehouse name is required" }
    if (name.length > 80) return { error: "Warehouse name is too long" }
    return { data: { name, code: String(body.code || "").trim().slice(0, 12), location: String(body.location || "").trim().slice(0, 200) } }
}

const getWarehouses = async (req, res) => {
    try {
        await reconcileStock()
        const warehouses = await Warehouse.find().sort({ isDefault: -1, name: 1 }).lean()
        const [rows, products] = await Promise.all([
            WarehouseStock.find({ quantity: { $gt: 0 } }).select("product warehouse quantity").lean(),
            Product.find().select("price").lean()
        ])
        const price = new Map(products.map((p) => [String(p._id), p.price]))
        const map = new Map()
        for (const r of rows) {
            if (!price.has(String(r.product))) continue
            const t = map.get(String(r.warehouse)) || { units: 0, products: 0, value: 0 }
            t.units += r.quantity; t.products += 1; t.value += r.quantity * price.get(String(r.product))
            map.set(String(r.warehouse), t)
        }
        const data = warehouses.map((w) => {
            const t = map.get(String(w._id))
            return { ...w, totalUnits: t ? t.units : 0, productCount: t ? t.products : 0, stockValue: t ? t.value : 0 }
        })
        res.json({ message: "Warehouses Fetched Successfully", data })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to fetch warehouses" })
    }
}

const createWarehouse = async (req, res) => {
    try {
        const { error, data } = cleanWarehouse(req.body)
        if (error) return res.status(400).json({ message: error })
        const dup = await Warehouse.findOne({ name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
        if (dup) return res.status(400).json({ message: "A warehouse with this name already exists" })
        await reconcileStock() // makes sure the default warehouse exists first
        const warehouse = await Warehouse.create(data)
        logActivity(req, "warehouse.create", "warehouse", warehouse._id, `Added warehouse ${warehouse.name}`)
        res.status(201).json({ message: "Warehouse Created Successfully", data: warehouse })
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: "A warehouse with this name already exists" })
        console.log(error)
        res.status(500).json({ message: "Unable to create warehouse" })
    }
}

const updateWarehouse = async (req, res) => {
    try {
        const { error, data } = cleanWarehouse(req.body)
        if (error) return res.status(400).json({ message: error })
        const dup = await Warehouse.findOne({ _id: { $ne: req.params.id }, name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
        if (dup) return res.status(400).json({ message: "A warehouse with this name already exists" })
        const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, data, { new: true })
        if (!warehouse) return res.status(404).json({ message: "Warehouse Not Found" })
        logActivity(req, "warehouse.update", "warehouse", warehouse._id, `Updated warehouse ${warehouse.name}`)
        res.json({ message: "Warehouse Updated Successfully", data: warehouse })
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: "A warehouse with this name already exists" })
        console.log(error)
        res.status(500).json({ message: "Unable to update warehouse" })
    }
}

const setWarehouseActive = async (req, res) => {
    try {
        const isActive = req.body.isActive === true
        const warehouse = await Warehouse.findById(req.params.id)
        if (!warehouse) return res.status(404).json({ message: "Warehouse Not Found" })
        if (!isActive && warehouse.isDefault) {
            return res.status(400).json({ message: "The default warehouse cannot be deactivated" })
        }
        warehouse.isActive = isActive
        await warehouse.save()
        logActivity(req, "warehouse.update", "warehouse", warehouse._id, `${isActive ? "Activated" : "Deactivated"} warehouse ${warehouse.name}`)
        res.json({ message: isActive ? "Warehouse activated" : "Warehouse deactivated", data: warehouse })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to update warehouse" })
    }
}

const getWarehouseInventory = async (req, res) => {
    try {
        await reconcileStock()
        const warehouse = await Warehouse.findById(req.params.id)
        if (!warehouse) return res.status(404).json({ message: "Warehouse Not Found" })
        const rows = await WarehouseStock.find({ warehouse: warehouse._id, quantity: { $gt: 0 } })
            .populate({ path: "product", select: "name sku unit price reorderLevel", populate: { path: "category", select: "name" } })
        const items = rows.filter((r) => r.product).map((r) => ({
            _id: r._id,
            product: r.product,
            quantity: r.quantity,
            // low-stock for the warehouse view uses the product's reorder level
            lowStock: r.quantity <= r.product.reorderLevel
        })).sort((a, b) => a.product.name.localeCompare(b.product.name))
        res.json({ message: "Warehouse Inventory Fetched Successfully", data: { warehouse, items } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to fetch warehouse inventory" })
    }
}

// ---------- transfers ----------
async function nextTransferNumber(skip = 0) {
    let n = (await StockTransfer.countDocuments()) + 1 + skip
    // guard against gaps/duplicates after deletions
    while (await StockTransfer.exists({ transferNumber: `TR-${String(n).padStart(4, "0")}` })) n++
    return `TR-${String(n).padStart(4, "0")}`
}

const createTransfer = async (req, res) => {
    try {
        const { fromWarehouse, toWarehouse, product: productId } = req.body
        const quantity = Number(req.body.quantity)
        const note = String(req.body.note || "").trim().slice(0, 500)

        if (![fromWarehouse, toWarehouse, productId].every((v) => mongoose.isValidObjectId(v))) {
            return res.status(400).json({ message: "Please select source, destination and product" })
        }
        if (String(fromWarehouse) === String(toWarehouse)) {
            return res.status(400).json({ message: "Source and destination must be different" })
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Quantity must be a whole number of at least 1" })
        }

        const [from, to, product] = await Promise.all([Warehouse.findById(fromWarehouse), Warehouse.findById(toWarehouse), Product.findById(productId)])
        if (!from || !to) return res.status(404).json({ message: "Warehouse Not Found" })
        if (!product) return res.status(404).json({ message: "Product Not Found" })
        if (!from.isActive || !to.isActive) return res.status(400).json({ message: "Both warehouses must be active" })

        await reconcileProduct(productId)
        // atomic: only succeeds if the source really holds enough
        if (!(await removeFromWarehouse(productId, from._id, quantity))) {
            const row = await WarehouseStock.findOne({ product: productId, warehouse: from._id })
            return res.status(400).json({ message: `Only ${row ? row.quantity : 0} ${product.unit} available in ${from.name}` })
        }

        let transfer
        try {
            await addToWarehouse(productId, to._id, quantity)
            // two simultaneous transfers can pick the same number; the unique index rejects one, so retry
            for (let attempt = 0; ; attempt++) {
                try {
                    transfer = await StockTransfer.create({
                        transferNumber: await nextTransferNumber(attempt),
                        fromWarehouse: from._id, toWarehouse: to._id, product: productId, quantity,
                        status: "Completed", note, performedBy: req.user.id
                    })
                    break
                } catch (e) { if (e.code !== 11000 || attempt >= 15) throw e }
            }
        } catch (err) {
            // undo both sides so nothing is lost
            await removeFromWarehouse(productId, to._id, quantity)
            await addToWarehouse(productId, from._id, quantity)
            throw err
        }

        logActivity(req, "transfer.create", "transfer", transfer._id, `Transferred ${quantity} × ${product.name} from ${from.name} to ${to.name}`)
        res.status(201).json({ message: "Stock Transferred Successfully", data: transfer })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to transfer stock" })
    }
}

const getTransfers = async (req, res) => {
    try {
        const transfers = await StockTransfer.find()
            .populate("fromWarehouse", "name")
            .populate("toWarehouse", "name")
            .populate("product", "name sku unit")
            .populate("performedBy", "name")
            .sort({ createdAt: -1 })
        res.json({ message: "Transfers Fetched Successfully", data: transfers })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to fetch transfers" })
    }
}

module.exports = { getWarehouses, createWarehouse, updateWarehouse, setWarehouseActive, getWarehouseInventory, createTransfer, getTransfers }
