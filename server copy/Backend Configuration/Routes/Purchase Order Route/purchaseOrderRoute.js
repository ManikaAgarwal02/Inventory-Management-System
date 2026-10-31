const express = require("express")
const router = express.Router()
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")
const c = require("../../Controllers/Purchase Order Controller/purchaseOrderController")

router.get("/purchase-orders", verifyToken, c.getOrders)
router.post("/purchase-orders", verifyToken, c.createOrder)
router.get("/purchase-orders/:id", verifyToken, c.getOrder)
router.put("/purchase-orders/:id", verifyToken, c.updateOrder)
router.post("/purchase-orders/:id/order", verifyToken, c.markOrdered)
router.post("/purchase-orders/:id/receive", verifyToken, c.receiveOrder)
router.post("/purchase-orders/:id/cancel", verifyToken, c.cancelOrder)
router.delete("/purchase-orders/:id", verifyToken, authorize("admin"), c.deleteOrder)

module.exports = router
