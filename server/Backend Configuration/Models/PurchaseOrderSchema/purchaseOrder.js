const mongoose = require("mongoose")

const itemSchema = mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, required: true, min: 0, default: 0 }
}, { _id: true })

const purchaseOrderSchema = mongoose.Schema({
    poNumber: { type: String, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    status: { type: String, enum: ["Draft", "Ordered", "Partially Received", "Received", "Cancelled"], default: "Draft" },
    notes: { type: String, default: "" },
    expectedDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
// save() fails with a VersionError if the order changed since it was read (guards against double-receive)
}, { timestamps: true, optimisticConcurrency: true })

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema)
