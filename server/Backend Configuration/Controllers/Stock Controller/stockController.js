const Product = require("../../Models/ProductSchema/product")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const stockIn = async (req, res) => {
    try {
        const { productId, quantity, note } = req.body

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        product.quantity = product.quantity + Number(quantity)
        await product.save()

        const transaction = await StockTransaction.create({
            product: productId,
            type: "IN",
            quantity,
            note,
            performedBy: req.user ? req.user.id : undefined
        })

        res.status(201).json({ message: "Stock In Recorded Successfully", data: transaction })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const stockOut = async (req, res) => {
    try {
        const { productId, quantity, note } = req.body

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        if (product.quantity < Number(quantity)) {
            return res.status(400).json({ message: "Insufficient Stock Available" })
        }

        product.quantity = product.quantity - Number(quantity)
        await product.save()

        const transaction = await StockTransaction.create({
            product: productId,
            type: "OUT",
            quantity,
            note,
            performedBy: req.user ? req.user.id : undefined
        })

        res.status(201).json({ message: "Stock Out Recorded Successfully", data: transaction })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getTransactions = async (req, res) => {
    try {
        const transactions = await StockTransaction.find()
            .populate("product", "name sku")
            .populate("performedBy", "name email")
            .sort({ createdAt: -1 })

        res.json({ message: "Stock Transactions Fetched Successfully", data: transactions })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = { stockIn, stockOut, getTransactions }
