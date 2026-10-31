const mongoose = require("mongoose")
const StockRequest = require("../../Models/StockRequestSchema/stockRequest")
const Product = require("../../Models/ProductSchema/product")
const logActivity = require("../../Configuration Folders/activityLogger")

const createStockRequest = async (req, res) => {
    try {
        const { product: productId, quantity, reason } = req.body

        if (!productId || !mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Valid product is required" })
        }

        const qty = Number(quantity)
        if (!Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({ message: "Quantity must be a positive integer" })
        }

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        const newRequest = await StockRequest.create({
            product: productId,
            requestedBy: req.user.id,
            quantity: qty,
            reason: String(reason || "").trim(),
            status: "Pending"
        })

        const populated = await StockRequest.findById(newRequest._id)
            .populate("product", "name sku unit quantity price")
            .populate("requestedBy", "name email")

        logActivity(req, "stockRequest.create", "stockRequest", newRequest._id, `Requested ${qty} ${product.unit || "pcs"} of ${product.name}`)

        res.status(201).json({
            message: "Stock request submitted successfully",
            data: populated
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message || "Unable to submit stock request" })
    }
}

const getMyStockRequests = async (req, res) => {
    try {
        const requests = await StockRequest.find({ requestedBy: req.user.id })
            .populate("product", "name sku unit quantity")
            .populate("reviewedBy", "name")
            .sort({ createdAt: -1 })

        res.json({
            message: "My stock requests fetched successfully",
            data: requests
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message || "Unable to fetch stock requests" })
    }
}

const getAllStockRequests = async (req, res) => {
    try {
        const filter = {}
        if (req.query.status && ["Pending", "Approved", "Rejected"].includes(req.query.status)) {
            filter.status = req.query.status
        }

        const requests = await StockRequest.find(filter)
            .populate("product", "name sku unit quantity")
            .populate("requestedBy", "name email")
            .populate("reviewedBy", "name")
            .sort({ createdAt: -1 })

        res.json({
            message: "All stock requests fetched successfully",
            data: requests
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message || "Unable to fetch stock requests" })
    }
}

const updateStockRequestStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status, adminNotes } = req.body

        if (!status || !["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ message: "Status must be either Approved or Rejected" })
        }

        const target = await StockRequest.findById(id).populate("product", "name")
        if (!target) {
            return res.status(404).json({ message: "Stock request not found" })
        }

        target.status = status
        if (adminNotes !== undefined) {
            target.adminNotes = String(adminNotes).trim()
        }
        target.reviewedBy = req.user.id
        target.reviewedAt = new Date()

        await target.save()

        const updated = await StockRequest.findById(id)
            .populate("product", "name sku unit quantity")
            .populate("requestedBy", "name email")
            .populate("reviewedBy", "name")

        logActivity(req, `stockRequest.${status.toLowerCase()}`, "stockRequest", id, `${status} request for ${target.quantity} units of ${target.product?.name || "product"}`)

        res.json({
            message: `Stock request ${status.toLowerCase()} successfully`,
            data: updated
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message || "Unable to update stock request" })
    }
}

module.exports = {
    createStockRequest,
    getMyStockRequests,
    getAllStockRequests,
    updateStockRequestStatus
}
