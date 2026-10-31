const Warehouse = require("../Models/WarehouseSchema/warehouse")
const WarehouseStock = require("../Models/WarehouseStockSchema/warehouseStock")
const Product = require("../Models/ProductSchema/product")

// Returns the default ("Main") warehouse, creating it the first time it is needed.
async function getDefaultWarehouse() {
    let wh = await Warehouse.findOne({ isDefault: true })
    if (wh) return wh
    try {
        wh = await Warehouse.create({ name: "Main Warehouse", code: "MAIN", isDefault: true })
    } catch (error) {
        if (error.code !== 11000) throw error
        wh = await Warehouse.findOne({ name: "Main Warehouse" })
        if (wh && !wh.isDefault) { wh.isDefault = true; await wh.save() }
    }
    return wh
}

// Products created before warehouses existed (or via plain stock-in) only have Product.quantity.
// Put any unassigned units into the default warehouse so the per-warehouse numbers add up.
async function reconcileStock() {
    const main = await getDefaultWarehouse()
    const sums = await WarehouseStock.aggregate([{ $group: { _id: "$product", total: { $sum: "$quantity" } } }])
    const sumMap = new Map(sums.map((s) => [String(s._id), s.total]))
    const products = await Product.find().select("quantity")
    for (const p of products) {
        const assigned = sumMap.get(String(p._id)) || 0
        if (p.quantity > assigned) {
            await WarehouseStock.updateOne(
                { product: p._id, warehouse: main._id },
                { $inc: { quantity: p.quantity - assigned } },
                { upsert: true }
            )
        }
    }
    return main
}

// Same idea for a single product (cheap enough to run on every stock movement).
async function reconcileProduct(productId) {
    const main = await getDefaultWarehouse()
    const product = await Product.findById(productId).select("quantity")
    if (!product) return main
    const rows = await WarehouseStock.aggregate([
        { $match: { product: product._id } },
        { $group: { _id: "$product", total: { $sum: "$quantity" } } }
    ])
    const assigned = rows.length ? rows[0].total : 0
    if (product.quantity > assigned) {
        await addToWarehouse(product._id, main._id, product.quantity - assigned)
    }
    return main
}

// Add units to a warehouse (upsert).
async function addToWarehouse(productId, warehouseId, qty) {
    await WarehouseStock.updateOne(
        { product: productId, warehouse: warehouseId },
        { $inc: { quantity: qty } },
        { upsert: true }
    )
}

// Atomically remove units from one warehouse; returns false if it doesn't hold enough.
async function removeFromWarehouse(productId, warehouseId, qty) {
    const res = await WarehouseStock.updateOne(
        { product: productId, warehouse: warehouseId, quantity: { $gte: qty } },
        { $inc: { quantity: -qty } }
    )
    return res.modifiedCount === 1
}

// Remove units from wherever they are (default warehouse first, then the rest).
// Used when a stock-out doesn't name a warehouse. Returns false (and changes nothing) if short.
async function removeFromAnyWarehouse(productId, qty) {
    const main = await getDefaultWarehouse()
    const rows = await WarehouseStock.find({ product: productId, quantity: { $gt: 0 } })
    rows.sort((a, b) => (String(b.warehouse) === String(main._id)) - (String(a.warehouse) === String(main._id)))
    const taken = []
    let left = qty
    for (const row of rows) {
        if (left <= 0) break
        const take = Math.min(row.quantity, left)
        if (await removeFromWarehouse(productId, row.warehouse, take)) {
            taken.push({ warehouse: row.warehouse, qty: take })
            left -= take
        }
    }
    if (left > 0) {
        for (const t of taken) await addToWarehouse(productId, t.warehouse, t.qty) // roll back
        return false
    }
    return true
}

module.exports = { getDefaultWarehouse, reconcileStock, reconcileProduct, addToWarehouse, removeFromWarehouse, removeFromAnyWarehouse }
