const express = require("express")
const router = express.Router()
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const { previewImport, commitImport } = require("../../Controllers/Import Controller/importController")

// body size limit (2mb) is set globally in server.js
router.post("/products/import/preview", verifyToken, previewImport)
router.post("/products/import", verifyToken, commitImport)

module.exports = router
