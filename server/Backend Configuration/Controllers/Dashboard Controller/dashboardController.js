const Product = require("../../Models/ProductSchema/product")
const Supplier = require("../../Models/SupplierSchema/supplier")
const Category = require("../../Models/CategorySchema/category")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const getStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments()
        const totalSuppliers = await Supplier.countDocuments()
        const totalCategories = await Category.countDocuments()

        const products = await Product.find()
        const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
        const totalStockUnits = products.reduce((sum, p) => sum + p.quantity, 0)

        const lowStockProducts = await Product.find({
            $expr: { $lte: ["$quantity", "$reorderLevel"] }
        }).countDocuments()

        const recentTransactions = await StockTransaction.find()
            .populate("product", "name sku")
            .sort({ createdAt: -1 })
            .limit(5)

        res.json({
            message: "Dashboard Stats Fetched Successfully",
            data: {
                totalProducts,
                totalSuppliers,
                totalCategories,
                totalStockValue,
                totalStockUnits,
                lowStockProducts,
                recentTransactions
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = { getStats }
