const Product = require("../../Models/ProductSchema/product")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const stockIn = async (req, res) => {
    try {
        const { productId, quantity, note } = req.body
        const numQty = Number(quantity)

        if (!productId) {
            return res.status(400).json({ message: "Product is required" })
        }
        if (isNaN(numQty) || numQty <= 0) {
            return res.status(400).json({ message: "Quantity must be greater than 0" })
        }

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        product.quantity = product.quantity + numQty
        await product.save()

        const transaction = await StockTransaction.create({
            product: productId,
            type: "IN",
            quantity: numQty,
            note: note?.trim() || "Stock In recorded",
            performedBy: req.user ? req.user.id : undefined
        })

        const populated = await StockTransaction.findById(transaction._id)
            .populate("product", "name sku unit")
            .populate("performedBy", "name email")

        res.status(201).json({ message: "Stock In Recorded Successfully", data: populated })
    } catch (error) {
        console.log("stockIn error:", error)
        res.status(500).json({ message: error.message || "Failed to record stock in" })
    }
}

const stockOut = async (req, res) => {
    try {
        const { productId, quantity, note } = req.body
        const numQty = Number(quantity)

        if (!productId) {
            return res.status(400).json({ message: "Product is required" })
        }
        if (isNaN(numQty) || numQty <= 0) {
            return res.status(400).json({ message: "Quantity must be greater than 0" })
        }

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        if (product.quantity < numQty) {
            return res.status(400).json({
                message: `Insufficient stock! Only ${product.quantity} ${product.unit} available.`
            })
        }

        product.quantity = product.quantity - numQty
        await product.save()

        const transaction = await StockTransaction.create({
            product: productId,
            type: "OUT",
            quantity: numQty,
            note: note?.trim() || "Stock Out recorded",
            performedBy: req.user ? req.user.id : undefined
        })

        const populated = await StockTransaction.findById(transaction._id)
            .populate("product", "name sku unit")
            .populate("performedBy", "name email")

        res.status(201).json({ message: "Stock Out Recorded Successfully", data: populated })
    } catch (error) {
        console.log("stockOut error:", error)
        res.status(500).json({ message: error.message || "Failed to record stock out" })
    }
}

const getTransactions = async (req, res) => {
    try {
        const transactions = await StockTransaction.find()
            .populate("product", "name sku unit price")
            .populate("performedBy", "name email")
            .sort({ createdAt: -1 })

        res.json({ message: "Stock Transactions Fetched Successfully", data: transactions })
    } catch (error) {
        console.log("getTransactions error:", error)
        res.status(500).json({ message: error.message || "Failed to fetch stock transactions" })
    }
}

module.exports = { stockIn, stockOut, getTransactions }
