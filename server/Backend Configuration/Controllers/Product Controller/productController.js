const Product = require("../../Models/ProductSchema/product")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const createProduct = async (req, res) => {
    try {
        const { name, sku, category, supplier, price, quantity, reorderLevel, unit } = req.body

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Product name is required" })
        }
        if (!sku || !sku.trim()) {
            return res.status(400).json({ message: "SKU code is required" })
        }

        const cleanSku = sku.trim().toUpperCase()
        const existing = await Product.findOne({ sku: cleanSku })
        if (existing) {
            return res.status(400).json({ message: `SKU '${cleanSku}' already exists` })
        }

        const numPrice = Number(price) >= 0 ? Number(price) : 0
        const numQty = Number(quantity) >= 0 ? Number(quantity) : 0
        const numReorder = Number(reorderLevel) >= 0 ? Number(reorderLevel) : 10

        const product = await Product.create({
            name: name.trim(),
            sku: cleanSku,
            category: category ? category : null,
            supplier: supplier ? supplier : null,
            price: numPrice,
            quantity: numQty,
            reorderLevel: numReorder,
            unit: unit?.trim() || "pcs"
        })

        // Also record opening inventory transaction if initial quantity > 0
        if (numQty > 0) {
            await StockTransaction.create({
                product: product._id,
                type: "IN",
                quantity: numQty,
                note: "Initial Opening Stock",
                performedBy: req.user ? req.user.id : undefined
            })
        }

        const populated = await Product.findById(product._id)
            .populate("category", "name")
            .populate("supplier", "name")

        res.status(201).json({ message: "Product Created Successfully", data: populated })
    } catch (error) {
        console.log("createProduct error:", error)
        res.status(500).json({ message: error.message || "Failed to create product" })
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
        console.log("getProducts error:", error)
        res.status(500).json({ message: error.message || "Failed to fetch products" })
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
        console.log("getProduct error:", error)
        res.status(500).json({ message: error.message || "Failed to fetch product" })
    }
}

const updateProduct = async (req, res) => {
    try {
        const { name, sku, category, supplier, price, quantity, reorderLevel, unit } = req.body

        if (sku) {
            const cleanSku = sku.trim().toUpperCase()
            const existing = await Product.findOne({ sku: cleanSku, _id: { $ne: req.params.id } })
            if (existing) {
                return res.status(400).json({ message: `SKU '${cleanSku}' is already used by another product` })
            }
        }

        const updateData = {
            name: name?.trim(),
            sku: sku ? sku.trim().toUpperCase() : undefined,
            category: category ? category : null,
            supplier: supplier ? supplier : null,
            unit: unit?.trim() || "pcs"
        }

        if (price !== undefined && price !== "") updateData.price = Math.max(0, Number(price))
        if (quantity !== undefined && quantity !== "") updateData.quantity = Math.max(0, Number(quantity))
        if (reorderLevel !== undefined && reorderLevel !== "") updateData.reorderLevel = Math.max(0, Number(reorderLevel))

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate("category", "name")
            .populate("supplier", "name")

        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        res.json({ message: "Product Updated Successfully", data: product })
    } catch (error) {
        console.log("updateProduct error:", error)
        res.status(500).json({ message: error.message || "Failed to update product" })
    }
}

const deleteProduct = async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id)
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Product Not Found" })
        }
        res.json({ success: true, message: "Product Has Been Deleted" })
    } catch (error) {
        console.log("deleteProduct error:", error)
        res.status(500).json({ success: false, message: error.message || "Failed to delete product" })
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
        console.log("getLowStockProducts error:", error)
        res.status(500).json({ message: error.message || "Failed to fetch low stock products" })
    }
}

// Quick Stock Update: Adjusts stock (+10, +5, -1, -5) and logs a transaction in the ledger
const quickStockUpdate = async (req, res) => {
    try {
        const { delta, note } = req.body
        const numDelta = Number(delta)

        if (isNaN(numDelta) || numDelta === 0) {
            return res.status(400).json({ message: "Invalid stock delta value" })
        }

        const product = await Product.findById(req.params.id)
        if (!product) {
            return res.status(404).json({ message: "Product Not Found" })
        }

        const newQty = product.quantity + numDelta
        if (newQty < 0) {
            return res.status(400).json({
                message: `Cannot reduce stock by ${Math.abs(numDelta)}. Only ${product.quantity} ${product.unit} available.`
            })
        }

        product.quantity = newQty
        await product.save()

        const transactionType = numDelta > 0 ? "IN" : "OUT"
        const qtyMagnitude = Math.abs(numDelta)

        await StockTransaction.create({
            product: product._id,
            type: transactionType,
            quantity: qtyMagnitude,
            note: note || `Quick stock ${transactionType === "IN" ? "addition" : "reduction"} (${numDelta > 0 ? "+" : ""}${numDelta})`,
            performedBy: req.user ? req.user.id : undefined
        })

        const updatedProduct = await Product.findById(product._id)
            .populate("category", "name")
            .populate("supplier", "name")

        res.json({
            message: `Stock updated successfully (${numDelta > 0 ? "+" : ""}${numDelta} ${product.unit})`,
            data: updatedProduct
        })
    } catch (error) {
        console.log("quickStockUpdate error:", error)
        res.status(500).json({ message: error.message || "Failed to adjust stock" })
    }
}

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    quickStockUpdate
}

