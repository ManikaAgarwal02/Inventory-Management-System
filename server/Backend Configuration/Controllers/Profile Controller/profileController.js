const crypto = require("crypto")
const bcrypt = require("bcrypt")
const User = require("../../Models/UserSchema/user")
const PasswordReset = require("../../Models/PasswordResetSchema/passwordReset")
const logActivity = require("../../Configuration Folders/activityLogger")

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MIN_PASSWORD = 6 // same rule as registration
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex")
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password")
        if (!user) return res.status(404).json({ message: "User not found" })
        res.json({ message: "Profile fetched", data: publicUser(user) })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to load profile" })
    }
}

const updateProfile = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim()
        const email = String(req.body.email || "").toLowerCase().trim()
        if (!name) return res.status(400).json({ message: "Name is required" })
        if (name.length > 80) return res.status(400).json({ message: "Name is too long" })
        if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address" })
        if (await User.findOne({ email, _id: { $ne: req.user.id } })) {
            return res.status(400).json({ message: "Another user already uses this email" })
        }
        // role is deliberately not editable here
        const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true })
        if (!user) return res.status(404).json({ message: "User not found" })
        res.json({ message: "Profile updated", data: publicUser(user) })
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: "Another user already uses this email" })
        console.log(error)
        res.status(500).json({ message: "Unable to update profile" })
    }
}

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body
        if ([currentPassword, newPassword, confirmPassword].some((v) => typeof v !== "string" || !v)) {
            return res.status(400).json({ message: "Current, new and confirm password are required" })
        }
        if (newPassword.length < MIN_PASSWORD) return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD} characters` })
        if (newPassword.length > 72) return res.status(400).json({ message: "New password is too long (max 72 characters)" })
        if (newPassword !== confirmPassword) return res.status(400).json({ message: "New password and confirmation do not match" })

        const user = await User.findById(req.user.id)
        if (!user) return res.status(404).json({ message: "User not found" })
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({ message: "Current password is incorrect" })
        }
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.status(400).json({ message: "New password must be different from the current one" })
        }
        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
        logActivity(req, "user.password", "user", user._id, `${user.email} changed their password`)
        res.json({ message: "Password changed successfully" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to change password" })
    }
}

// There is no mail server in this project, so the reset link is printed in the server console.
// Set RESET_LINK_IN_RESPONSE=true (demo only) to also return it in the API response.
const forgotPassword = async (req, res) => {
    const generic = { message: "If an account exists for that email, a password reset link has been generated." }
    try {
        const email = String(req.body.email || "").toLowerCase().trim()
        if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address" })

        const user = await User.findOne({ email })
        if (!user) return res.json(generic) // same answer either way: no account enumeration

        await PasswordReset.deleteMany({ user: user._id })
        const token = crypto.randomBytes(32).toString("hex")
        await PasswordReset.create({ user: user._id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) })

        const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")
        const link = `${base}/reset-password/${token}`
        console.log(`[password reset] ${email} -> ${link} (valid for 30 minutes)`)

        if (process.env.RESET_LINK_IN_RESPONSE === "true") return res.json({ ...generic, resetLink: link })
        res.json(generic)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to process the request" })
    }
}

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body
        if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ message: "This reset link is invalid or has expired" })
        }
        if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` })
        }
        if (newPassword.length > 72) return res.status(400).json({ message: "Password is too long (max 72 characters)" })
        if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" })

        // mark used atomically so a link can only be spent once
        const record = await PasswordReset.findOneAndUpdate(
            { tokenHash: sha256(token), used: false, expiresAt: { $gt: new Date() } },
            { used: true }
        )
        if (!record) return res.status(400).json({ message: "This reset link is invalid or has expired" })

        const user = await User.findById(record.user)
        if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired" })
        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
        await PasswordReset.deleteMany({ user: user._id })
        res.json({ message: "Password has been reset. You can now log in." })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to reset password" })
    }
}

module.exports = { getProfile, updateProfile, changePassword, forgotPassword, resetPassword }
