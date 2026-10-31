const mongoose = require("mongoose")

// Only the SHA-256 hash of the token is stored, never the token itself.
const passwordResetSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
}, { timestamps: true })

// MongoDB removes expired documents automatically
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("PasswordReset", passwordResetSchema)
