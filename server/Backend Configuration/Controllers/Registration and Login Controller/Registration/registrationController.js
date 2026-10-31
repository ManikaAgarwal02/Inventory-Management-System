const User = require("../../../Models/UserSchema/user")
const bcrypt = require("bcrypt")

// Public sign-up must not let anyone make themselves an admin.
//  - the very first account becomes admin (otherwise nobody could ever manage the system)
//  - every later sign-up is staff; admins promote people from Manage Staff
//  - set ALLOW_ADMIN_SIGNUP=true in .env to restore the old "pick a role" behaviour for demos
const register = async (req, res) => {
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
            return res.status(400).json({ message: "User Already Exists" })
        }

        const isFirstUser = (await User.countDocuments()) === 0
        const adminSignupAllowed = process.env.ALLOW_ADMIN_SIGNUP === "true"
        const finalRole = isFirstUser || (adminSignupAllowed && role === "admin") ? "admin" : "staff"

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,
            role: finalRole
        })

        res.status(201).json({
            message: "Registration Successful",
            registeredData: { id: user._id, name: user.name, email: user.email, role: user.role }
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "User Already Exists" })
        }
        console.log(error)
        res.status(500).json({ message: "Unable to register right now" })
    }
}

module.exports = { register }
