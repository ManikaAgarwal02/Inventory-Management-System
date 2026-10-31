const express = require("express")
const router = express.Router()
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const {
    createStockRequest,
    getMyStockRequests,
    getAllStockRequests,
    updateStockRequestStatus
} = require("../../Controllers/Stock Request Controller/stockRequestController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")

router.post("/stock-requests", verifyToken, createStockRequest)
router.get("/stock-requests/my", verifyToken, getMyStockRequests)
router.get("/stock-requests", verifyToken, authorize("admin"), getAllStockRequests)
router.patch("/stock-requests/:id/status", verifyToken, authorize("admin"), updateStockRequestStatus)

module.exports = router
