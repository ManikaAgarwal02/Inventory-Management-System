import { useEffect, useState } from "react"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"

function StockForm({ products, onClose, onSaved, defaultProductId = "", defaultType = "IN", defaultQuantity = "" }) {
    const [form, setForm] = useState({
        productId: defaultProductId,
        type: defaultType,
        quantity: defaultQuantity,
        note: "",
        warehouseId: ""
    })
    const [warehouses, setWarehouses] = useState([])
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get("/warehouses").then((res) => setWarehouses((res.data.data || []).filter((w) => w.isActive))).catch(() => {})
    }, [])

    const selectedProduct = products.find((p) => p._id === form.productId)

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")

        const quantity = Number(form.quantity)
        if (!Number.isInteger(quantity) || quantity < 1) {
            setError("Quantity must be a whole number of at least 1")
            return
        }
        if (form.type === "OUT" && selectedProduct && quantity > selectedProduct.quantity) {
            setError(`Only ${selectedProduct.quantity} ${selectedProduct.unit} in stock`)
            return
        }

        setSaving(true)
        try {
            const endpoint = form.type === "IN" ? "/stock/in" : "/stock/out"
            await api.post(endpoint, {
                productId: form.productId,
                quantity,
                note: form.note,
                warehouseId: form.warehouseId || undefined
            })
            onSaved(form.type)
        } catch (err) {
            setError(getErrorMessage(err, "Unable To Record Transaction"))
        } finally {
            setSaving(false)
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

                    {warehouses.length > 0 && (
                        <div className={styles.formRow}>
                            <label>Warehouse</label>
                            <select name="warehouseId" value={form.warehouseId} onChange={handleChange}>
                                <option value="">{form.type === "IN" ? "Default warehouse" : "Any warehouse (default first)"}</option>
                                {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className={styles.formRow}>
                        <label>Quantity</label>
                        <input type="number" min="1" step="1" name="quantity" value={form.quantity} onChange={handleChange} required />
                    </div>

                    <div className={styles.formRow}>
                        <label>Note (optional)</label>
                        <input name="note" value={form.note} onChange={handleChange} placeholder="e.g. Purchase order #204" />
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? "Saving..." : "Record Movement"}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default StockForm
