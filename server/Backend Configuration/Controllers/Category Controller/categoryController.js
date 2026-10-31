const Category = require("../../Models/CategorySchema/category")
const Product = require("../../Models/ProductSchema/product")
const logActivity = require("../../Configuration Folders/activityLogger")

const createCategory = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim()
        const description = String(req.body.description || "").trim()

        if (!name) {
            return res.status(400).json({ message: "Category name is required" })
        }

        // case-insensitive duplicate check
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const existing = await Category.findOne({ name: new RegExp(`^${escaped}$`, "i") })
        if (existing) {
            return res.status(400).json({ message: "Category Already Exists" })
        }

        const category = await Category.create({ name, description })
        logActivity(req, "category.create", "category", category._id, `Added category ${category.name}`)
        res.status(201).json({ message: "Category Created Successfully", data: category })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Category Already Exists" })
        }
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 })
        res.json({ message: "Categories Fetched Successfully", data: categories })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id)
        if (!category) {
            return res.status(404).json({ success: false, message: "Category Not Found" })
        }
        await Product.updateMany({ category: req.params.id }, { $set: { category: null } })
        logActivity(req, "category.delete", "category", category._id, `Deleted category ${category.name}`)
        res.json({ success: true, message: "Category Has Been Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

module.exports = { createCategory, getCategories, deleteCategory }
