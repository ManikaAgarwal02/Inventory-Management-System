const Supplier = require("../../Models/SupplierSchema/supplier")

const createSupplier = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body
        const supplier = await Supplier.create({ name, email, phone, address })
        res.status(201).json({ message: "Supplier Added Successfully", data: supplier })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 })
        res.json({ message: "Suppliers Fetched Successfully", data: suppliers })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const updateSupplier = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { name, email, phone, address },
            { new: true }
        )
        res.json({ message: "Supplier Updated Successfully", data: supplier })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const deleteSupplier = async (req, res) => {
    try {
        await Supplier.findByIdAndDelete(req.params.id)
        res.json({ success: true, message: "Supplier Has Been Deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

module.exports = { createSupplier, getSuppliers, updateSupplier, deleteSupplier }
