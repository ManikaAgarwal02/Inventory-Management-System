const Category = require("../../Models/CategorySchema/category")

const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body
        const existing = await Category.findOne({ name })
        if (existing) {
            return res.status(400).json({ message: "Category Already Exists" })
        }
        const category = await Category.create({ name, description })
        res.status(201).json({ message: "Category Created Successfully", data: category })
    } catch (error) {
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
        await Category.findByIdAndDelete(req.params.id)
        res.json({ success: true, message: "Category Has Been Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

module.exports = { createCategory, getCategories, deleteCategory }
