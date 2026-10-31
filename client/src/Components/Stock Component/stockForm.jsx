import { useState } from "react"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"

function StockForm({ products, initialProductId = "", initialQuantity = "", onClose, onSaved }) {
    const [form, setForm] = useState({
        productId: initialProductId,
        type: "IN",
        quantity: initialQuantity,
        note: initialQuantity ? "Restock order replenishment" : ""
    })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")

        if (!form.productId) {
            setError("Please select a product.")
            return
        }
        if (Number(form.quantity) <= 0) {
            setError("Quantity must be greater than zero.")
            return
        }

        try {
            setLoading(true)
            const endpoint = form.type === "IN" ? "/stock/in" : "/stock/out"
            await api.post(endpoint, {
                productId: form.productId,
                quantity: Number(form.quantity),
                note: form.note.trim()
            })
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || "Unable to record transaction")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>Record Stock Movement</h3>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label>Movement Type</label>
                        <select name="type" value={form.type} onChange={handleChange}>
                            <option value="IN">+ Stock In (Purchase / Return)</option>
                            <option value="OUT">- Stock Out (Dispatch / Sale / Damage)</option>
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <label>Product *</label>
                        <select name="productId" value={form.productId} onChange={handleChange} required>
                            <option value="">Select Product</option>
                            {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.name} ({p.sku}) — {p.quantity} {p.unit} in stock
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <label>Quantity *</label>
                        <input
                            type="number"
                            min="1"
                            name="quantity"
                            value={form.quantity}
                            onChange={handleChange}
                            placeholder="Enter quantity"
                            required
                        />
                    </div>

                    <div className={styles.formRow}>
                        <label>Note / Reference (optional)</label>
                        <input
                            name="note"
                            value={form.note}
                            onChange={handleChange}
                            placeholder="e.g. PO #1084 or Customer Order"
                        />
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
                            {loading ? "Recording..." : "Save Movement"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default StockForm
