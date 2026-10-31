import { useState } from "react"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`

function PurchaseOrderForm({ order, suppliers, products, onClose, onSaved }) {
    const [supplier, setSupplier] = useState(order ? (order.supplier?._id || "") : "")
    const [notes, setNotes] = useState(order?.notes || "")
    const [expectedDate, setExpectedDate] = useState(order?.expectedDate ? order.expectedDate.slice(0, 10) : "")
    const [items, setItems] = useState(
        order
            ? order.items.map((i) => ({ product: i.product?._id || "", quantity: String(i.quantity), unitPrice: String(i.unitPrice) }))
            : [{ product: "", quantity: "1", unitPrice: "" }]
    )
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    function updateItem(index, field, value) {
        setItems((current) => current.map((item, i) => {
            if (i !== index) return item
            const next = { ...item, [field]: value }
            // pre-fill the purchase price from the product the first time it is chosen
            if (field === "product" && value && item.unitPrice === "") {
                const p = products.find((x) => x._id === value)
                if (p) next.unitPrice = String(p.price)
            }
            return next
        }))
    }

    const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)

    async function submit(e, placeOrder) {
        e.preventDefault()
        setError("")
        if (!supplier) return setError("Please select a supplier")
        if (items.length === 0) return setError("Add at least one product")
        const chosen = new Set()
        for (const [n, i] of items.entries()) {
            if (!i.product) return setError(`Line ${n + 1}: select a product`)
            if (chosen.has(i.product)) return setError("A product can only appear once per order")
            chosen.add(i.product)
            const q = Number(i.quantity)
            if (!Number.isInteger(q) || q < 1) return setError(`Line ${n + 1}: quantity must be a whole number of at least 1`)
            if (i.unitPrice === "" || !(Number(i.unitPrice) >= 0)) return setError(`Line ${n + 1}: enter a purchase price (0 or more)`)
        }

        setSaving(true)
        try {
            const payload = {
                supplier, notes, expectedDate: expectedDate || undefined,
                items: items.map((i) => ({ product: i.product, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
            }
            if (order) {
                await api.put(`/purchase-orders/${order._id}`, payload)
                if (placeOrder) await api.post(`/purchase-orders/${order._id}/order`)
            } else {
                await api.post("/purchase-orders", { ...payload, status: placeOrder ? "Ordered" : "Draft" })
            }
            onSaved(order ? "updated" : "created", placeOrder)
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save purchase order"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalBox} ${styles.modalWide}`}>
                <h3 className={styles.modalTitle}>{order ? `Edit ${order.poNumber}` : "New Purchase Order"}</h3>
                <form onSubmit={(e) => submit(e, false)} noValidate>
                    <div className={styles.formGridWide}>
                        <div className={styles.formRow}>
                            <label>Supplier</label>
                            <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                                <option value="">Select supplier</option>
                                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <label>Expected Delivery (optional)</label>
                            <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.lineItems}>
                        <div className={`${styles.lineItem} ${styles.lineHead}`}>
                            <span>Product</span><span>Qty</span><span>Price (₹)</span><span style={{ textAlign: "right" }}>Line total</span><span />
                        </div>
                        {items.map((item, index) => (
                            <div key={index} className={styles.lineItem}>
                                <select value={item.product} onChange={(e) => updateItem(index, "product", e.target.value)} aria-label="Product">
                                    <option value="">Select product</option>
                                    {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                                </select>
                                <input type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} aria-label="Quantity" />
                                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} aria-label="Purchase price" />
                                <span className={`${styles.mono} ${styles.lineTotal}`}>{rupees((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
                                <button type="button" className={styles.removeBtn} onClick={() => setItems(items.filter((_, i) => i !== index))} aria-label="Remove line" disabled={items.length === 1}>×</button>
                            </div>
                        ))}
                        <div>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setItems([...items, { product: "", quantity: "1", unitPrice: "" }])}>+ Add product</button>
                        </div>
                    </div>

                    <div className={styles.totalBar}><span className={styles.mutedText}>Total</span><strong>{rupees(total)}</strong></div>

                    <div className={styles.formRow}>
                        <label>Notes (optional)</label>
                        <textarea rows="2" maxLength="1000" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, payment terms…" />
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.secondaryBtn} disabled={saving}>{saving ? "Saving..." : "Save as Draft"}</button>
                        <button type="button" className={styles.primaryBtn} disabled={saving} onClick={(e) => submit(e, true)}>Save &amp; Place Order</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PurchaseOrderForm
