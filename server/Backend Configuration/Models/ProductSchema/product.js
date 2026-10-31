const mongoose = require("mongoose")

const productSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    price: { type: Number, required: true, default: 0, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, required: true, default: 10, min: 0 },
    unit: { type: String, default: "pcs", trim: true }
}, { timestamps: true })

module.exports = mongoose.model("Product", productSchema)
