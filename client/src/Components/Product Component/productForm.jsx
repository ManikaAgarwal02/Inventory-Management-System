import { useEffect, useState } from "react"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"

const emptyForm = {
    name: "",
    sku: "",
    category: "",
    supplier: "",
    price: "",
    quantity: "",
    reorderLevel: "10",
    unit: "pcs"
}

function ProductForm({ product, categories, suppliers, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name || "",
                sku: product.sku || "",
                category: product.category?._id || "",
                supplier: product.supplier?._id || "",
                price: product.price ?? "",
                quantity: product.quantity ?? "",
                reorderLevel: product.reorderLevel ?? "10",
                unit: product.unit || "pcs"
            })
        } else {
            setForm(emptyForm)
        }
    }, [product])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")

        if (!form.name.trim()) {
            setError("Product name is required.")
            return
        }
        if (!form.sku.trim()) {
            setError("SKU is required.")
            return
        }
        if (Number(form.price) < 0) {
            setError("Price cannot be negative.")
            return
        }
        if (Number(form.quantity) < 0) {
            setError("Quantity cannot be negative.")
            return
        }
        if (Number(form.reorderLevel) < 0) {
            setError("Reorder level cannot be negative.")
            return
        }

        try {
            setLoading(true)
            const payload = {
                ...form,
                name: form.name.trim(),
                sku: form.sku.trim().toUpperCase(),
                category: form.category || null,
                supplier: form.supplier || null,
                price: Number(form.price),
                quantity: Number(form.quantity),
                reorderLevel: Number(form.reorderLevel),
                unit: form.unit.trim() || "pcs"
            }

            if (product) {
                await api.put(`/products/${product._id}`, payload)
                onSaved(`Updated "${payload.name}" successfully!`)
            } else {
                await api.post("/products", payload)
                onSaved(`Created "${payload.name}" successfully!`)
            }
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save product. Please check the inputs.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} style={{ width: 540 }}>
                <h3 className={styles.modalTitle}>{product ? "Edit Product" : "Add New Product"}</h3>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={styles.formRow}>
                            <label>Product Name *</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. Wireless Mouse"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>SKU Code *</label>
                            <input
                                name="sku"
                                value={form.sku}
                                onChange={handleChange}
                                placeholder="e.g. ELEC-MOU-01"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>Category</label>
                            <select name="category" value={form.category} onChange={handleChange}>
                                <option value="">Select Category (Optional)</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <label>Supplier</label>
                            <select name="supplier" value={form.supplier} onChange={handleChange}>
                                <option value="">Select Supplier (Optional)</option>
                                {suppliers.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <label>Unit Price (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                name="price"
                                value={form.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>Unit of Measure</label>
                            <input
                                name="unit"
                                value={form.unit}
                                onChange={handleChange}
                                placeholder="pcs, box, kg, etc."
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>{product ? "Current Quantity *" : "Opening Stock Quantity *"}</label>
                            <input
                                type="number"
                                min="0"
                                name="quantity"
                                value={form.quantity}
                                onChange={handleChange}
                                placeholder="0"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>Reorder Threshold *</label>
                            <input
                                type="number"
                                min="0"
                                name="reorderLevel"
                                value={form.reorderLevel}
                                onChange={handleChange}
                                placeholder="10"
                                title="Triggers low-stock warning when stock drops to or below this level"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: "#cf222e", background: "#ffebe9", border: "1px solid #ffc1c0", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                            {error}
                        </div>
                    )}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.primaryBtn} disabled={loading}>
                            {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ProductForm
