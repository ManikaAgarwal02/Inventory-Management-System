const mongoose = require("mongoose")

const stockTransferSchema = mongoose.Schema({
    transferNumber: { type: String, unique: true },
    fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Completed" },
    note: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true })

module.exports = mongoose.model("StockTransfer", stockTransferSchema)
