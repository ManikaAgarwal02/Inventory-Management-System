const express = require("express")
const router = express.Router()
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const { updateUser, toggleUserStatus, createStaffUser } = require("../../Controllers/User Updation Controller/userController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")

router.put("/user/update/:id", verifyToken, authorize("admin"), updateUser)
router.patch("/user/toggle-status/:id", verifyToken, authorize("admin"), toggleUserStatus)
router.post("/users", verifyToken, authorize("admin"), createStaffUser)

module.exports = router
