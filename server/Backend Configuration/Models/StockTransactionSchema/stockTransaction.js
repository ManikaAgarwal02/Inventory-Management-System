const mongoose = require("mongoose")

const stockTransactionSchema = mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ["IN", "OUT"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    note: { type: String, default: "" },
    // why the movement happened; lets reports separate purchases / adjustments / sales
    reason: { type: String, enum: ["manual", "purchase", "adjustment", "opening", "import"], default: "manual" },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    reference: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true })

module.exports = mongoose.model("StockTransaction", stockTransactionSchema)
