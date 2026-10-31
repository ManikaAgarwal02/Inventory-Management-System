const express = require("express")
const router = express.Router()
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const { getSummary } = require("../../Controllers/Report Controller/reportController")

router.get("/reports/summary", verifyToken, getSummary)

module.exports = router
