const mongoose = require("mongoose")
const PurchaseOrder = require("../../Models/PurchaseOrderSchema/purchaseOrder")
const Supplier = require("../../Models/SupplierSchema/supplier")
const Product = require("../../Models/ProductSchema/product")
const Warehouse = require("../../Models/WarehouseSchema/warehouse")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")
const logActivity = require("../../Configuration Folders/activityLogger")
const { getDefaultWarehouse, reconcileProduct, addToWarehouse, removeFromWarehouse } = require("../../Configuration Folders/warehouseStock")

const populateOrder = (q) => q
    .populate("supplier", "name email phone")
    .populate("items.product", "name sku unit price")
    .populate("createdBy", "name")

const withTotal = (po) => {
    const o = po.toObject ? po.toObject() : po
    o.total = o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    o.receivedValue = o.items.reduce((s, i) => s + i.receivedQuantity * i.unitPrice, 0)
    return o
}

async function nextPoNumber() {
    let n = (await PurchaseOrder.countDocuments()) + 1
    while (await PurchaseOrder.exists({ poNumber: `PO-${1000 + n}` })) n++
    return `PO-${1000 + n}`
}

// validates supplier + items from the form; returns { error } or { data }
async function cleanOrder(body) {
    if (!mongoose.isValidObjectId(body.supplier)) return { error: "Please select a supplier" }
    if (!(await Supplier.exists({ _id: body.supplier }))) return { error: "Selected supplier does not exist" }
    if (!Array.isArray(body.items) || body.items.length === 0) return { error: "Add at least one product" }
    if (body.items.length > 100) return { error: "Too many line items" }

    const seen = new Set()
    const items = []
    for (const raw of body.items) {
        if (!mongoose.isValidObjectId(raw.product)) return { error: "Each line needs a valid product" }
        if (seen.has(String(raw.product))) return { error: "A product can only appear once per order" }
        seen.add(String(raw.product))
        const quantity = Number(raw.quantity)
        const unitPrice = Number(raw.unitPrice)
        if (!Number.isInteger(quantity) || quantity < 1) return { error: "Quantity must be a whole number of at least 1" }
        if (raw.unitPrice === "" || raw.unitPrice === null || raw.unitPrice === undefined || !Number.isFinite(unitPrice) || unitPrice < 0) return { error: "Purchase price must be 0 or more" }
        items.push({ product: raw.product, quantity, unitPrice })
    }
    const count = await Product.countDocuments({ _id: { $in: [...seen] } })
    if (count !== seen.size) return { error: "One or more selected products no longer exist" }

    let expectedDate
    if (body.expectedDate) {
        expectedDate = new Date(body.expectedDate)
        if (isNaN(expectedDate.getTime())) return { error: "Invalid expected date" }
    }
    return { data: { supplier: body.supplier, items, notes: String(body.notes || "").trim().slice(0, 1000), expectedDate } }
}

const getOrders = async (req, res) => {
    try {
        const filter = {}
        if (typeof req.query.status === "string" && req.query.status) filter.status = req.query.status
        const orders = await populateOrder(PurchaseOrder.find(filter).sort({ createdAt: -1 }))
        res.json({ message: "Purchase Orders Fetched Successfully", data: orders.map(withTotal) })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to fetch purchase orders" })
    }
}

const getOrder = async (req, res) => {
    try {
        const po = await populateOrder(PurchaseOrder.findById(req.params.id))
        if (!po) return res.status(404).json({ message: "Purchase Order Not Found" })
        res.json({ message: "Purchase Order Fetched Successfully", data: withTotal(po) })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to fetch purchase order" })
    }
}

const createOrder = async (req, res) => {
    try {
        const { error, data } = await cleanOrder(req.body)
        if (error) return res.status(400).json({ message: error })
        // "Place order immediately" saves it as Ordered instead of Draft
        const status = req.body.status === "Ordered" ? "Ordered" : "Draft"
        let po
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                po = await PurchaseOrder.create({ ...data, status, poNumber: await nextPoNumber(), createdBy: req.user.id })
                break
            } catch (e) { if (e.code !== 11000 || attempt === 2) throw e }
        }
        logActivity(req, "po.create", "purchaseOrder", po._id, `Created ${po.poNumber} (${status})`)
        res.status(201).json({ message: "Purchase Order Created Successfully", data: po })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to create purchase order" })
    }
}

const updateOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
        if (!po) return res.status(404).json({ message: "Purchase Order Not Found" })
        if (po.status !== "Draft") return res.status(400).json({ message: "Only draft orders can be edited" })
        const { error, data } = await cleanOrder(req.body)
        if (error) return res.status(400).json({ message: error })
        po.supplier = data.supplier
        po.items = data.items
        po.notes = data.notes
        po.expectedDate = data.expectedDate
        await po.save()
        logActivity(req, "po.update", "purchaseOrder", po._id, `Edited ${po.poNumber}`)
        res.json({ message: "Purchase Order Updated Successfully", data: po })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to update purchase order" })
    }
}

// Draft -> Ordered
const markOrdered = async (req, res) => {
    try {
        const po = await PurchaseOrder.findOneAndUpdate({ _id: req.params.id, status: "Draft" }, { status: "Ordered" }, { new: true })
        if (!po) {
            const exists = await PurchaseOrder.exists({ _id: req.params.id })
            return res.status(exists ? 400 : 404).json({ message: exists ? "Only draft orders can be placed" : "Purchase Order Not Found" })
        }
        logActivity(req, "po.order", "purchaseOrder", po._id, `Placed ${po.poNumber}`)
        res.json({ message: "Purchase Order Placed", data: po })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to place purchase order" })
    }
}

const cancelOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
        if (!po) return res.status(404).json({ message: "Purchase Order Not Found" })
        if (po.status === "Cancelled") return res.status(400).json({ message: "Order is already cancelled" })
        if (po.status === "Received") return res.status(400).json({ message: "A fully received order cannot be cancelled" })
        if (po.items.some((i) => i.receivedQuantity > 0)) {
            return res.status(400).json({ message: "Stock has already been received against this order, so it cannot be cancelled" })
        }
        po.status = "Cancelled"
        await po.save()
        logActivity(req, "po.cancel", "purchaseOrder", po._id, `Cancelled ${po.poNumber}`)
        res.json({ message: "Purchase Order Cancelled", data: po })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to cancel purchase order" })
    }
}

const deleteOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
        if (!po) return res.status(404).json({ message: "Purchase Order Not Found" })
        if (po.status !== "Draft" && po.status !== "Cancelled") {
            return res.status(400).json({ message: "Only draft or cancelled orders can be deleted" })
        }
        await po.deleteOne()
        logActivity(req, "po.delete", "purchaseOrder", po._id, `Deleted ${po.poNumber}`)
        res.json({ success: true, message: "Purchase Order Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to delete purchase order" })
    }
}

// body: { warehouseId?, items: [{ itemId, quantity }] }
const receiveOrder = async (req, res) => {
    // units already applied, so we can undo them if a later step fails
    const applied = []
    let committed = false
    let lines = []
    try {
        const po = await PurchaseOrder.findById(req.params.id)
        if (!po) return res.status(404).json({ message: "Purchase Order Not Found" })
        if (!["Ordered", "Partially Received"].includes(po.status)) {
            return res.status(400).json({ message: po.status === "Draft" ? "Place the order before receiving stock" : `A ${po.status.toLowerCase()} order cannot receive stock` })
        }

        let warehouse
        if (req.body.warehouseId) {
            if (!mongoose.isValidObjectId(req.body.warehouseId)) return res.status(400).json({ message: "Invalid warehouse" })
            warehouse = await Warehouse.findById(req.body.warehouseId)
            if (!warehouse) return res.status(404).json({ message: "Warehouse Not Found" })
            if (!warehouse.isActive) return res.status(400).json({ message: "Warehouse is inactive" })
        } else {
            warehouse = await getDefaultWarehouse()
        }

        if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
            return res.status(400).json({ message: "Enter a received quantity for at least one item" })
        }

        // validate every line before touching anything
        lines = []
        const seen = new Set()
        for (const raw of req.body.items) {
            const qty = Number(raw.quantity)
            if (raw.quantity === "" || raw.quantity === undefined || qty === 0) continue
            if (!mongoose.isValidObjectId(raw.itemId)) return res.status(400).json({ message: "Invalid order line" })
            if (seen.has(String(raw.itemId))) return res.status(400).json({ message: "Duplicate order line" })
            seen.add(String(raw.itemId))
            const item = po.items.id(raw.itemId)
            if (!item) return res.status(400).json({ message: "Order line not found" })
            if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ message: "Received quantity must be a whole number, 0 or more" })
            const remaining = item.quantity - item.receivedQuantity
            if (qty > remaining) {
                return res.status(400).json({ message: `Cannot receive ${qty}: only ${remaining} remaining for this item` })
            }
            lines.push({ item, qty })
        }
        if (lines.length === 0) return res.status(400).json({ message: "Enter a received quantity for at least one item" })

        for (const { item } of lines) await reconcileProduct(item.product)

        // 1) record the received quantities on the PO. save() uses optimistic concurrency, so if someone
        //    else changed the order since we read it the save fails (409) instead of double-counting.
        for (const { item, qty } of lines) item.receivedQuantity += qty
        po.status = po.items.every((i) => i.receivedQuantity >= i.quantity) ? "Received" : "Partially Received"
        await po.save()
        committed = true

        // 2) increase inventory (product total, warehouse, ledger)
        for (const { item, qty } of lines) {
            await Product.updateOne({ _id: item.product }, { $inc: { quantity: qty } })
            applied.push({ kind: "product", product: item.product, qty })
            await addToWarehouse(item.product, warehouse._id, qty)
            applied.push({ kind: "wh", product: item.product, qty })
            const tx = await StockTransaction.create({
                product: item.product, type: "IN", quantity: qty, reason: "purchase",
                note: `Received against ${po.poNumber}`, reference: po.poNumber,
                warehouse: warehouse._id, performedBy: req.user.id
            })
            applied.push({ kind: "tx", id: tx._id })
        }

        logActivity(req, "po.receive", "purchaseOrder", po._id, `Received ${lines.reduce((s, l) => s + l.qty, 0)} units against ${po.poNumber} into ${warehouse.name} (${po.status})`)
        res.json({ message: po.status === "Received" ? "Order fully received" : "Stock received", data: withTotal(await populateOrder(PurchaseOrder.findById(po._id))) })
    } catch (error) {
        // roll back whatever had been applied
        for (const a of applied.reverse()) {
            try {
                if (a.kind === "product") await Product.updateOne({ _id: a.product }, { $inc: { quantity: -a.qty } })
                if (a.kind === "wh") {
                    const wh = req.body.warehouseId && mongoose.isValidObjectId(req.body.warehouseId) ? req.body.warehouseId : (await getDefaultWarehouse())._id
                    await removeFromWarehouse(a.product, wh, a.qty)
                }
                if (a.kind === "tx") await StockTransaction.deleteOne({ _id: a.id })
            } catch (e) { console.log("rollback failed:", e.message) }
        }
        if (committed) {
            try {
                const po = await PurchaseOrder.findById(req.params.id)
                for (const { item, qty } of lines) { const line = po.items.id(item._id); if (line) line.receivedQuantity -= qty }
                po.status = po.items.some((i) => i.receivedQuantity > 0) ? "Partially Received" : "Ordered"
                await po.save()
            } catch (e) { console.log("rollback of PO failed:", e.message) }
        }
        if (error.name === "VersionError" || error.conflict) return res.status(409).json({ message: "This order was just updated by someone else. Reload and try again." })
        console.log(error)
        res.status(500).json({ message: "Unable to receive stock" })
    }
}

module.exports = { getOrders, getOrder, createOrder, updateOrder, markOrdered, cancelOrder, deleteOrder, receiveOrder }
