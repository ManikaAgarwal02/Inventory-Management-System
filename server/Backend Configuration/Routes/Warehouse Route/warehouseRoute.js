const express = require("express")
const router = express.Router()
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")
const c = require("../../Controllers/Warehouse Controller/warehouseController")

router.get("/warehouses", verifyToken, c.getWarehouses)
router.post("/warehouses", verifyToken, c.createWarehouse)
router.put("/warehouses/:id", verifyToken, c.updateWarehouse)
router.patch("/warehouses/:id/active", verifyToken, authorize("admin"), c.setWarehouseActive)
router.get("/warehouses/:id/inventory", verifyToken, c.getWarehouseInventory)

router.get("/transfers", verifyToken, c.getTransfers)
router.post("/transfers", verifyToken, c.createTransfer)

module.exports = router
