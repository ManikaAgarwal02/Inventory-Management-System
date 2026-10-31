const mongoose = require("mongoose")

// How many units of a product sit in one warehouse.
// Invariant: sum of WarehouseStock.quantity for a product == Product.quantity
const warehouseStockSchema = mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, required: true, default: 0, min: 0 }
}, { timestamps: true })

warehouseStockSchema.index({ product: 1, warehouse: 1 }, { unique: true })

module.exports = mongoose.model("WarehouseStock", warehouseStockSchema)
