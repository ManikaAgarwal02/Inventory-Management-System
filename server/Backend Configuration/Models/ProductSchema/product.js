const mongoose = require("mongoose")

const productSchema = mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    price: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, required: true, default: 10 },
    unit: { type: String, default: "pcs" }
}, { timestamps: true })

module.exports = mongoose.model("Product", productSchema)
