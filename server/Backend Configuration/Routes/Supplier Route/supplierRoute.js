const express = require("express")
const router = express.Router()
const { createSupplier, getSuppliers, updateSupplier, deleteSupplier } = require("../../Controllers/Supplier Controller/supplierController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")

router.post("/suppliers", verifyToken, createSupplier)
router.get("/suppliers", verifyToken, getSuppliers)
router.put("/suppliers/:id", verifyToken, updateSupplier)
router.delete("/suppliers/:id", verifyToken, deleteSupplier)

module.exports = router
