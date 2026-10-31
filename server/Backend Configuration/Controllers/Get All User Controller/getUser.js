const User = require("../../Models/UserSchema/user")

async function getUser(req, res) {
    try {
        // never send password hashes to the client
        const users = await User.find().select("-password").sort({ createdAt: -1 })
        res.json({
            message: "Users fetched successfully",
            data: users
        })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: "Unable to fetch users" })
    }
}

module.exports = getUser
