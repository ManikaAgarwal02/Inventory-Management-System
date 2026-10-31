const express = require("express")
const router = express.Router()
const { getStats } = require("../../Controllers/Dashboard Controller/dashboardController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")

router.get("/dashboard/stats", verifyToken, getStats)

module.exports = router
