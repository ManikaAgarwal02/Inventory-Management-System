const Product = require("../../Models/ProductSchema/product")

const createProduct = async (req, res) => {
    try {
        const { name, sku, category, supplier, price, quantity, reorderLevel, unit } = req.body

        const existing = await Product.findOne({ sku })
        if (existing) {
            return res.status(400).json({ message: "SKU Already Exists" })
        }

        const product = await Product.create({
            name, sku, category, supplier,
            price, quantity, reorderLevel, unit
        })

        res.status(201).json({ message: "Product Created Successfully", data: product })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate("category", "name")
            .populate("supplier", "name")
            .sort({ createdAt: -1 })

        res.json({ message: "Products Fetched Successfully", data: products })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("category", "name")
            .populate("supplier", "name")

        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        res.json({ message: "Product Fetched Successfully", data: product })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const updateProduct = async (req, res) => {
    try {
        const { name, sku, category, supplier, price, quantity, reorderLevel, unit } = req.body

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { name, sku, category, supplier, price, quantity, reorderLevel, unit },
            { new: true }
        )

        res.json({ message: "Product Updated Successfully", data: product })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id)
        res.json({ success: true, message: "Product Has Been Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

const getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({
            $expr: { $lte: ["$quantity", "$reorderLevel"] }
        })
            .populate("category", "name")
            .populate("supplier", "name")
            .sort({ quantity: 1 })

        res.json({ message: "Low Stock Products Fetched Successfully", data: products })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts
}
