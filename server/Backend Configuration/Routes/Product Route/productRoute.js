const express = require("express")
const router = express.Router()
const {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts
} = require("../../Controllers/Product Controller/productController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")

router.post("/products", verifyToken, createProduct)
router.get("/products", verifyToken, getProducts)
router.get("/products/low-stock", verifyToken, getLowStockProducts)
router.get("/products/:id", verifyToken, getProduct)
router.put("/products/:id", verifyToken, updateProduct)
router.delete("/products/:id", verifyToken, deleteProduct)

module.exports = router
