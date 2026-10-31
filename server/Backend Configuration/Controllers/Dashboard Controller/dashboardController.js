const Product = require("../../Models/ProductSchema/product")
const Supplier = require("../../Models/SupplierSchema/supplier")
const Category = require("../../Models/CategorySchema/category")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const getStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments()
        const totalSuppliers = await Supplier.countDocuments()
        const totalCategories = await Category.countDocuments()

        const products = await Product.find().populate("category", "name")

        const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
        const totalStockUnits = products.reduce((sum, p) => sum + p.quantity, 0)

        // Categorize stock statuses
        let outOfStockCount = 0
        let lowStockCount = 0
        let healthyStockCount = 0

        // Aggregate by category for the chart
        const categoryMap = {}

        products.forEach((p) => {
            if (p.quantity === 0) {
                outOfStockCount++
            } else if (p.quantity <= p.reorderLevel) {
                lowStockCount++
            } else {
                healthyStockCount++
            }

            const catName = p.category ? p.category.name : "Uncategorized"
            if (!categoryMap[catName]) {
                categoryMap[catName] = { name: catName, productCount: 0, stockValue: 0, totalUnits: 0 }
            }
            categoryMap[catName].productCount++
            categoryMap[catName].stockValue += (p.price * p.quantity)
            categoryMap[catName].totalUnits += p.quantity
        })

        const categoryDistribution = Object.values(categoryMap).sort((a, b) => b.stockValue - a.stockValue)

        // Calculate Inventory Health
        let healthStatus = "Good"
        let healthScore = 100
        let healthMessage = "All inventory items are currently well-stocked and healthy."

        if (totalProducts > 0) {
            const healthyRatio = healthyStockCount / totalProducts
            healthScore = Math.round(healthyRatio * 100)

            if (outOfStockCount > 0) {
                healthStatus = "Critical"
                healthMessage = `${outOfStockCount} item(s) are completely out of stock and require immediate replenishment.`
            } else if (lowStockCount > 0) {
                healthStatus = "Needs Attention"
                healthMessage = `${lowStockCount} item(s) are below reorder threshold. Consider placing restock orders.`
            }
        }

        const recentTransactions = await StockTransaction.find()
            .populate("product", "name sku unit")
            .populate("performedBy", "name email")
            .sort({ createdAt: -1 })
            .limit(6)

        const recentProducts = await Product.find()
            .populate("category", "name")
            .sort({ updatedAt: -1 })
            .limit(5)

        res.json({
            message: "Dashboard Stats Fetched Successfully",
            data: {
                totalProducts,
                totalSuppliers,
                totalCategories,
                totalStockValue,
                totalStockUnits,
                lowStockProducts: lowStockCount,
                outOfStockProducts: outOfStockCount,
                healthyStockProducts: healthyStockCount,
                inventoryHealth: {
                    status: healthStatus,
                    score: healthScore,
                    message: healthMessage
                },
                categoryDistribution,
                recentTransactions,
                recentProducts
            }
        })
    } catch (error) {
        console.log("getStats error:", error)
        res.status(500).json({ message: error.message || "Failed to fetch dashboard statistics" })
    }
}

module.exports = { getStats }
