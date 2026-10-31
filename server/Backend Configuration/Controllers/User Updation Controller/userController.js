const User = require("../../Models/UserSchema/user")
const logActivity = require("../../Configuration Folders/activityLogger")

const bcrypt = require("bcrypt")

const updateUser = async (req, res) => {
    try {
        const { name } = req.body
        const email = String(req.body.email || "").toLowerCase().trim()
        const role = req.body.role // optional, keeps old clients working
        const isActive = req.body.isActive // optional boolean

        if (!name || typeof name !== "string" || !name.trim() || !email) {
            return res.status(400).json({ message: "Name and email are required" })
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" })
        }
        if (role !== undefined && role !== "admin" && role !== "staff") {
            return res.status(400).json({ message: "Role must be admin or staff" })
        }
        if (isActive !== undefined && typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive must be a boolean" })
        }

        const target = await User.findById(req.params.id).select("role isActive")
        if (!target) {
            return res.status(404).json({ message: "User not found" })
        }

        if (isActive === false && req.params.id === req.user.id) {
            return res.status(400).json({ message: "You cannot deactivate your own account" })
        }

        const demoting = role === "staff" && target.role === "admin"
        if (demoting) {
            if (req.params.id === req.user.id) {
                return res.status(400).json({ message: "You cannot remove your own admin access" })
            }
            const admins = await User.countDocuments({ role: "admin" })
            if (admins <= 1) {
                return res.status(400).json({ message: "At least one admin is required" })
            }
        }

        const duplicate = await User.findOne({ email, _id: { $ne: req.params.id } })
        if (duplicate) {
            return res.status(400).json({ message: "Another user already uses this email" })
        }

        const changes = { name: name.trim(), email }
        if (role) changes.role = role
        if (typeof isActive === "boolean") changes.isActive = isActive

        const updatedUser = await User.findByIdAndUpdate(req.params.id, changes, { new: true }).select("-password")

        if (role && role !== target.role) {
            logActivity(req, "user.role", "user", updatedUser._id, `${updatedUser.email}: ${target.role} → ${role}`)
        }
        if (typeof isActive === "boolean" && isActive !== target.isActive) {
            logActivity(req, isActive ? "user.activate" : "user.deactivate", "user", updatedUser._id, `${updatedUser.email}: ${isActive ? "activated" : "deactivated"}`)
        }

        res.json({ message: "Successfully updated", data: updatedUser })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Another user already uses this email" })
        }
        console.log(error)
        res.status(500).json({ message: "Unable to update user" })
    }
}

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params
        if (id === req.user.id) {
            return res.status(400).json({ message: "You cannot change the status of your own account" })
        }

        const target = await User.findById(id)
        if (!target) {
            return res.status(404).json({ message: "User not found" })
        }

        // Toggle isActive
        target.isActive = target.isActive === false ? true : false
        await target.save()

        logActivity(req, target.isActive ? "user.activate" : "user.deactivate", "user", target._id, `${target.email}: ${target.isActive ? "activated" : "deactivated"}`)

        res.json({
            message: target.isActive ? "Account activated successfully" : "Account deactivated successfully",
            data: {
                id: target._id,
                name: target.name,
                email: target.email,
                role: target.role,
                isActive: target.isActive
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to toggle user status" })
    }
}

const createStaffUser = async (req, res) => {
    try {
        const { name, password, role } = req.body
        const email = String(req.body.email || "").toLowerCase().trim()

        if (!name || typeof name !== "string" || !name.trim() || !email || !password || typeof password !== "string") {
            return res.status(400).json({ message: "Name, email and password are required" })
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" })
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        const checkExistingUser = await User.findOne({ email })
        if (checkExistingUser) {
            return res.status(400).json({ message: "User with this email already exists" })
        }

        const targetRole = role === "admin" ? "admin" : "staff"
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,
            role: targetRole,
            isActive: true
        })

        logActivity(req, "user.create", "user", user._id, `Admin created staff account for ${user.email} (${targetRole})`)

        res.status(201).json({
            message: "Staff Account Created Successfully",
            data: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "User with this email already exists" })
        }
        console.log(error)
        res.status(500).json({ message: "Unable to create staff account" })
    }
}

module.exports = updateUser
module.exports.updateUser = updateUser
module.exports.toggleUserStatus = toggleUserStatus
module.exports.createStaffUser = createStaffUser
