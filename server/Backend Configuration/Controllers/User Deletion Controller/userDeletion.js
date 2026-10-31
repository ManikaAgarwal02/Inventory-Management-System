const User = require("../../Models/UserSchema/user")
const logActivity = require("../../Configuration Folders/activityLogger")

const deletedUser = async (req, res) => {
    try {
        const { id } = req.params

        if (req.user.id === id) {
            return res.status(400).json({ success: false, message: "You cannot delete your own account" })
        }

        const removed = await User.findByIdAndDelete(id)
        if (!removed) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        logActivity(req, "user.delete", "user", id, `Deleted user ${removed.email}`)
        res.json({ success: true, message: "User has been deleted" })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ success: false, message: "Server Error" })
    }
}

module.exports = { deletedUser }
