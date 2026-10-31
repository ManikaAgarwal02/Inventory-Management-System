const Supplier = require("../../Models/SupplierSchema/supplier")
const Product = require("../../Models/ProductSchema/product")
const logActivity = require("../../Configuration Folders/activityLogger")

function cleanSupplierInput(body) {
    const name = String(body.name || "").trim()
    const email = String(body.email || "").trim()
    if (!name) return { error: "Supplier name is required" }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid supplier email" }
    return {
        data: {
            name,
            email,
            phone: String(body.phone || "").trim(),
            address: String(body.address || "").trim()
        }
    }
}

const createSupplier = async (req, res) => {
    try {
        const { error, data } = cleanSupplierInput(req.body)
        if (error) return res.status(400).json({ message: error })

        const supplier = await Supplier.create(data)
        logActivity(req, "supplier.create", "supplier", supplier._id, `Added supplier ${supplier.name}`)
        res.status(201).json({ message: "Supplier Added Successfully", data: supplier })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean()

        // how many products each supplier provides
        const counts = await Product.aggregate([
            { $match: { supplier: { $ne: null } } },
            { $group: { _id: "$supplier", count: { $sum: 1 } } }
        ])
        const countMap = new Map(counts.map((c) => [String(c._id), c.count]))
        const data = suppliers.map((s) => ({ ...s, productCount: countMap.get(String(s._id)) || 0 }))

        res.json({ message: "Suppliers Fetched Successfully", data })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const updateSupplier = async (req, res) => {
    try {
        const { error, data } = cleanSupplierInput(req.body)
        if (error) return res.status(400).json({ message: error })

        const supplier = await Supplier.findByIdAndUpdate(req.params.id, data, { new: true })
        if (!supplier) {
            return res.status(404).json({ message: "Supplier Not Found" })
        }
        logActivity(req, "supplier.update", "supplier", supplier._id, `Updated supplier ${supplier.name}`)
        res.json({ message: "Supplier Updated Successfully", data: supplier })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id)
        if (!supplier) {
            return res.status(404).json({ success: false, message: "Supplier Not Found" })
        }
        // don't leave products pointing at a supplier that no longer exists
        await Product.updateMany({ supplier: req.params.id }, { $set: { supplier: null } })
        logActivity(req, "supplier.delete", "supplier", supplier._id, `Deleted supplier ${supplier.name}`)
        res.json({ success: true, message: "Supplier Has Been Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

module.exports = { createSupplier, getSuppliers, updateSupplier, deleteSupplier }
