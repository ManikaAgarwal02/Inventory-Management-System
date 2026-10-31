const express = require("express")
const router = express.Router()
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const { deletedUser } = require("../../Controllers/User Deletion Controller/userDeletion")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")

router.delete("/user/delete/:id", verifyToken, authorize("admin"), deletedUser)

module.exports = router
