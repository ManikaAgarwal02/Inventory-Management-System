const express = require("express")
const router = express.Router()
const { stockIn, stockOut, getTransactions } = require("../../Controllers/Stock Controller/stockController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")

router.post("/stock/in", verifyToken, stockIn)
router.post("/stock/out", verifyToken, stockOut)
router.get("/stock/transactions", verifyToken, getTransactions)

module.exports = router
