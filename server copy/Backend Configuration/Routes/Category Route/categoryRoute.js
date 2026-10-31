const express = require("express")
const router = express.Router()
const authorize = require("../../Configuration Folders/Middleware Configuration/roleSpecificMiddleware")
router.param("id", require("../../Configuration Folders/Middleware Configuration/validateObjectId"))
const { createCategory, getCategories, deleteCategory } = require("../../Controllers/Category Controller/categoryController")
const verifyToken = require("../../Configuration Folders/Middleware Configuration/authMiddleware")

router.post("/categories", verifyToken, createCategory)
router.get("/categories", verifyToken, getCategories)
router.delete("/categories/:id", verifyToken, authorize("admin"), deleteCategory)

module.exports = router
