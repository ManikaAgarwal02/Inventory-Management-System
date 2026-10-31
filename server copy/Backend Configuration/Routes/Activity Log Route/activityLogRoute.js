const express = require("express")
const router = express.Router()
const { getActivityLogs } = require("../../Controllers/Activity Log Controller/activityLogController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")

router.get("/activity-logs", verifyToken, authorize("admin"), getActivityLogs)

module.exports = router
