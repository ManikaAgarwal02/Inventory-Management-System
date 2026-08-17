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
    reorderLevel: "",
    unit: "pcs"
}

function ProductForm({ product, categories, suppliers, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState("")

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name || "",
                sku: product.sku || "",
                category: product.category?._id || "",
                supplier: product.supplier?._id || "",
                price: product.price ?? "",
                quantity: product.quantity ?? "",
                reorderLevel: product.reorderLevel ?? "",
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
        try {
            if (product) {
                await api.put(`/products/${product._id}`, form)
            } else {
                await api.post("/products", form)
            }
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || "Unable To Save Product")
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalBox} style={{ width: 520 }}>
                <h3 className={styles.modalTitle}>{product ? "Edit Product" : "Add Product"}</h3>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={styles.formRow}>
                            <label>Product Name</label>
                            <input name="name" value={form.name} onChange={handleChange} required />
                        </div>
                        <div className={styles.formRow}>
                            <label>SKU</label>
                            <input name="sku" value={form.sku} onChange={handleChange} required />
                        </div>
                        <div className={styles.formRow}>
                            <label>Category</label>
                            <select name="category" value={form.category} onChange={handleChange}>
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <label>Supplier</label>
                            <select name="supplier" value={form.supplier} onChange={handleChange}>
                                <option value="">Select Supplier</option>
                                {suppliers.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <label>Price</label>
                            <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} required />
                        </div>
                        <div className={styles.formRow}>
                            <label>Unit</label>
                            <input name="unit" value={form.unit} onChange={handleChange} placeholder="pcs, box, kg..." />
                        </div>
                        <div className={styles.formRow}>
                            <label>Opening Quantity</label>
                            <input type="number" min="0" name="quantity" value={form.quantity} onChange={handleChange} required />
                        </div>
                        <div className={styles.formRow}>
                            <label>Reorder Level</label>
                            <input type="number" min="0" name="reorderLevel" value={form.reorderLevel} onChange={handleChange} required />
                        </div>
                    </div>

                    {error && <p style={{ color: "#b3261e", fontSize: 13 }}>{error}</p>}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn}>{product ? "Save Changes" : "Add Product"}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ProductForm
