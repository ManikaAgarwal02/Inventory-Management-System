const User = require("../../../Models/UserSchema/user")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const getJwtSecret = require("../../../Configuration Folders/jwtSecret")

const loginController = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Email and password are required" })
        }

        const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() })
        if (!existingUser) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const matchedPassword = await bcrypt.compare(password, existingUser.password)
        if (!matchedPassword) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        if (existingUser.isActive === false) {
            return res.status(403).json({ message: "Your account has been deactivated. Please contact an administrator." })
        }

        const token = jwt.sign(
            { id: existingUser._id, email: existingUser.email, role: existingUser.role },
            getJwtSecret(),
            { expiresIn: "8h" }
        )

        res.json({
            message: "Logged in Successfully",
            token,
            user: {
                id: existingUser._id,
                name: existingUser.name,
                email: existingUser.email,
                role: existingUser.role
            }
        })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: "Unable to log in right now" })
    }
}

module.exports = loginController
