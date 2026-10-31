const mongoose = require("mongoose")

const stockRequestSchema = mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    adminNotes: { type: String, trim: true, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date }
}, { timestamps: true })

module.exports = mongoose.model("StockRequest", stockRequestSchema)
