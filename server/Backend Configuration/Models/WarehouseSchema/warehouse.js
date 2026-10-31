const mongoose = require("mongoose")

const warehouseSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, uppercase: true, default: "" },
    location: { type: String, trim: true, default: "" },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

module.exports = mongoose.model("Warehouse", warehouseSchema)
