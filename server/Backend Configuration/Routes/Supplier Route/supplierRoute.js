const express = require("express")
const router = express.Router()
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const { createSupplier, getSuppliers, updateSupplier, deleteSupplier } = require("../../Controllers/Supplier Controller/supplierController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")

router.post("/suppliers", verifyToken, createSupplier)
router.get("/suppliers", verifyToken, getSuppliers)
router.put("/suppliers/:id", verifyToken, updateSupplier)
router.delete("/suppliers/:id", verifyToken, authorize("admin"), deleteSupplier)

module.exports = router
