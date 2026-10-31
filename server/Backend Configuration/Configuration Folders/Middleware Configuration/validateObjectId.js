const mongoose = require("mongoose")

// Use with router.param("id", validateObjectId) so a malformed id returns 400
// instead of a Mongoose CastError (500).
const validateObjectId = (req, res, next, value) => {
    if (!mongoose.isValidObjectId(value)) {
        return res.status(400).json({ success: false, message: "Invalid id" })
    }
    next()
}

module.exports = validateObjectId
