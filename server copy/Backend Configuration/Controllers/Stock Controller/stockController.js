const mongoose = require("mongoose")
const Product = require("../../Models/ProductSchema/product")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")
const logActivity = require("../../Configuration Folders/activityLogger")
const Warehouse = require("../../Models/WarehouseSchema/warehouse")
const { getDefaultWarehouse, reconcileProduct, addToWarehouse, removeFromWarehouse, removeFromAnyWarehouse } = require("../../Configuration Folders/warehouseStock")

// Shared by stock-in and stock-out.
async function recordMovement(req, res, type) {
    try {
        const { productId } = req.body
        const note = String(req.body.note || "").trim().slice(0, 500)
        const quantity = Number(req.body.quantity)

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Please select a valid product" })
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Quantity must be a whole number of at least 1" })
        }

        // optional warehouse; stock-in defaults to the main warehouse, stock-out to wherever stock is
        let warehouse = null
        if (req.body.warehouseId) {
            if (!mongoose.isValidObjectId(req.body.warehouseId)) {
                return res.status(400).json({ message: "Invalid warehouse" })
            }
            warehouse = await Warehouse.findById(req.body.warehouseId)
            if (!warehouse) return res.status(404).json({ message: "Warehouse Not Found" })
            if (!warehouse.isActive) return res.status(400).json({ message: "Warehouse is inactive" })
        }

        if (!(await Product.exists({ _id: productId }))) {
            return res.status(404).json({ message: "Product Not Found" })
        }
        await reconcileProduct(productId)

        if (type === "IN" && !warehouse) warehouse = await getDefaultWarehouse()

        // take stock out of the warehouse first (atomic), then from the product total
        if (type === "OUT") {
            const ok = warehouse
                ? await removeFromWarehouse(productId, warehouse._id, quantity)
                : await removeFromAnyWarehouse(productId, quantity)
            if (!ok) return res.status(400).json({ message: "Insufficient Stock Available" })
        }

        const filter = { _id: productId }
        if (type === "OUT") filter.quantity = { $gte: quantity }

        const delta = type === "IN" ? quantity : -quantity
        const product = await Product.findOneAndUpdate(filter, { $inc: { quantity: delta } }, { new: true })

        if (!product) {
            if (type === "OUT") {
                // put the units back where they came from
                if (warehouse) await addToWarehouse(productId, warehouse._id, quantity)
                else await addToWarehouse(productId, (await getDefaultWarehouse())._id, quantity)
            }
            return res.status(400).json({ message: "Insufficient Stock Available" })
        }
        if (type === "IN") await addToWarehouse(productId, warehouse._id, quantity)

        let transaction
        try {
            transaction = await StockTransaction.create({
                product: productId,
                type,
                quantity,
                note,
                warehouse: warehouse ? warehouse._id : undefined,
                performedBy: req.user ? req.user.id : undefined
            })
        } catch (ledgerError) {
            // keep quantity and ledger consistent: undo the stock change if history couldn't be written
            await Product.updateOne({ _id: productId }, { $inc: { quantity: -delta } })
            if (type === "IN") await removeFromWarehouse(productId, warehouse._id, quantity)
            else await addToWarehouse(productId, warehouse ? warehouse._id : (await getDefaultWarehouse())._id, quantity)
            throw ledgerError
        }

        logActivity(req, type === "IN" ? "stock.in" : "stock.out", "stock", transaction._id,
            `${type === "IN" ? "Stock in" : "Stock out"} ${quantity} × ${product.name} (now ${product.quantity})`)

        res.status(201).json({
            message: type === "IN" ? "Stock In Recorded Successfully" : "Stock Out Recorded Successfully",
            data: transaction,
            newQuantity: product.quantity
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const stockIn = (req, res) => recordMovement(req, res, "IN")
const stockOut = (req, res) => recordMovement(req, res, "OUT")

const getTransactions = async (req, res) => {
    try {
        const transactions = await StockTransaction.find()
            .populate("product", "name sku")
            .populate("performedBy", "name email")
            .populate("warehouse", "name")
            .sort({ createdAt: -1 })

        res.json({ message: "Stock Transactions Fetched Successfully", data: transactions })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = { stockIn, stockOut, getTransactions }
