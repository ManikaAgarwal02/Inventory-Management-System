const mongoose = require("mongoose")

const stockTransactionSchema = mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ["IN", "OUT"], required: true },
    quantity: { type: Number, required: true },
    note: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true })

module.exports = mongoose.model("StockTransaction", stockTransactionSchema)
