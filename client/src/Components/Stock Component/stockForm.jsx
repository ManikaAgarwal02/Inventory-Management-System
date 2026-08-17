import { useState } from "react"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"

function StockForm({ products, onClose, onSaved }) {
    const [form, setForm] = useState({ productId: "", type: "IN", quantity: "", note: "" })
    const [error, setError] = useState("")

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        try {
            const endpoint = form.type === "IN" ? "/stock/in" : "/stock/out"
            await api.post(endpoint, {
                productId: form.productId,
                quantity: form.quantity,
                note: form.note
            })
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || "Unable To Record Transaction")
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
                <h3 className={styles.modalTitle}>Record Stock Movement</h3>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label>Movement Type</label>
                        <select name="type" value={form.type} onChange={handleChange}>
                            <option value="IN">Stock In</option>
                            <option value="OUT">Stock Out</option>
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <label>Product</label>
                        <select name="productId" value={form.productId} onChange={handleChange} required>
                            <option value="">Select Product</option>
                            {products.map((p) => (
                                <option key={p._id} value={p._id}>{p.name} ({p.sku}) — {p.quantity} in stock</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <label>Quantity</label>
                        <input type="number" min="1" name="quantity" value={form.quantity} onChange={handleChange} required />
                    </div>

                    <div className={styles.formRow}>
                        <label>Note (optional)</label>
                        <input name="note" value={form.note} onChange={handleChange} placeholder="e.g. Purchase order #204" />
                    </div>

                    {error && <p style={{ color: "#b3261e", fontSize: 13 }}>{error}</p>}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn}>Record Movement</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default StockForm
