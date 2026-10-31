const jwt = require("jsonwebtoken")
const getJwtSecret = require("../jwtSecret")
const User = require("../../Models/UserSchema/user")

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization

const token= authHeader.split(" ")[1];

    const token = authHeader.split(" ")[1]

    let payload
    try {
        payload = jwt.verify(token, getJwtSecret())
    } catch (error) {
        const message = error.name === "TokenExpiredError" ? "Session expired, please log in again" : "Token is invalid"
        return res.status(401).json({ message })
    }

    try {
        // A deleted user or a demoted admin must lose access immediately,
        // not when the 8h token happens to expire.
        const current = await User.findById(payload.id).select("name email role isActive")
        if (!current) {
            return res.status(401).json({ message: "Account no longer exists, please log in again" })
        }
        if (current.isActive === false) {
            return res.status(403).json({ message: "Your account has been deactivated" })
        }
        req.user = { id: String(current._id), name: current.name, email: current.email, role: current.role }
        next()
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: "Unable to verify session" })
    }
}

module.exports = verifyToken
