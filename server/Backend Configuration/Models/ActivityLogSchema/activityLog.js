const mongoose = require("mongoose")

const activityLogSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // snapshot, so the log stays readable after a user is deleted
    userName: { type: String, default: "" },
    action: { type: String, required: true },   // e.g. "product.create"
    entity: { type: String, required: true },   // product | supplier | category | stock | user
    entityId: { type: String, default: "" },
    summary: { type: String, default: "" }
}, { timestamps: true })

activityLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model("ActivityLog", activityLogSchema)
