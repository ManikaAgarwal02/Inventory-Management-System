const Product = require("../../Models/ProductSchema/product")
const Supplier = require("../../Models/SupplierSchema/supplier")
const Category = require("../../Models/CategorySchema/category")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const getStats = async (req, res) => {
    try {
        const [totalProducts, totalSuppliers, totalCategories] = await Promise.all([
            Product.countDocuments(),
            Supplier.countDocuments(),
            Category.countDocuments()
        ])

        const products = await Product.find().select("name sku price quantity reorderLevel unit")

        const totalStockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)
        const totalStockUnits = products.reduce((sum, p) => sum + p.quantity, 0)
        const lowStockList = products
            .filter((p) => p.quantity <= p.reorderLevel)
            .sort((a, b) => a.quantity - b.quantity)
        const lowStockProducts = lowStockList.length
        const outOfStockProducts = products.filter((p) => p.quantity === 0).length

        // the 5 products that need attention first
        const lowStockPreview = lowStockList.slice(0, 5)

        const recentTransactions = await StockTransaction.find()
            .populate("product", "name sku")
            .populate("performedBy", "name")
            .sort({ createdAt: -1 })
            .limit(5)

        // units moved in / out during the last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const weekly = await StockTransaction.aggregate([
            { $match: { createdAt: { $gte: weekAgo } } },
            { $group: { _id: "$type", units: { $sum: "$quantity" } } }
        ])
        const weeklyMovement = {
            inUnits: 0,
            outUnits: 0,
            transactions: await StockTransaction.countDocuments({ createdAt: { $gte: weekAgo } })
        }
        weekly.forEach((row) => {
            if (row._id === "IN") weeklyMovement.inUnits = row.units
            if (row._id === "OUT") weeklyMovement.outUnits = row.units
        })

        // daily in/out units for the last 7 days (oldest first, zero-filled) for the trend chart
        const dayKey = (d) => d.toISOString().slice(0, 10)
        const trendStart = new Date()
        trendStart.setUTCHours(0, 0, 0, 0)
        trendStart.setUTCDate(trendStart.getUTCDate() - 6)
        const trendRows = await StockTransaction.aggregate([
            { $match: { createdAt: { $gte: trendStart } } },
            { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" }, units: { $sum: "$quantity" } } }
        ])
        const dailyMovement = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(trendStart)
            d.setUTCDate(trendStart.getUTCDate() + i)
            dailyMovement.push({ date: dayKey(d), inUnits: 0, outUnits: 0 })
        }
        trendRows.forEach((row) => {
            const entry = dailyMovement.find((e) => e.date === row._id.day)
            if (!entry) return
            if (row._id.type === "IN") entry.inUnits = row.units
            if (row._id.type === "OUT") entry.outUnits = row.units
        })

        // best sellers: most units moved out in the last 30 days
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const topMovedRows = await StockTransaction.aggregate([
            { $match: { type: "OUT", createdAt: { $gte: monthAgo } } },
            { $group: { _id: "$product", units: { $sum: "$quantity" } } },
            { $sort: { units: -1 } },
            { $limit: 5 },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $project: { _id: 0, name: "$product.name", sku: "$product.sku", units: 1 } }
        ])

        res.json({
            message: "Dashboard Stats Fetched Successfully",
            data: {
                totalProducts,
                totalSuppliers,
                totalCategories,
                totalStockValue,
                totalStockUnits,
                lowStockProducts,
                outOfStockProducts,
                lowStockPreview,
                weeklyMovement,
                dailyMovement,
                topMovedProducts: topMovedRows,
                recentTransactions
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = { getStats }
