const express = require("express")
const router = express.Router()
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const rateLimit = require("../../Configuration Folders/Middleware Configuration/rateLimit")
const c = require("../../Controllers/Profile Controller/profileController")

const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many attempts, please try again in a few minutes" })
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: "Too many attempts, please try again in a few minutes" })

router.get("/profile", verifyToken, c.getProfile)
router.put("/profile", verifyToken, c.updateProfile)
router.put("/profile/password", verifyToken, passwordLimiter, c.changePassword)
router.post("/auth/forgot-password", resetLimiter, c.forgotPassword)
router.post("/auth/reset-password", resetLimiter, c.resetPassword)

module.exports = router
