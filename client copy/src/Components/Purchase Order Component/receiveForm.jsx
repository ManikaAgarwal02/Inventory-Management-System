import { useEffect, useState } from "react"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"

function ReceiveForm({ order, onClose, onSaved }) {
    const [warehouses, setWarehouses] = useState([])
    const [warehouseId, setWarehouseId] = useState("")
    const [qty, setQty] = useState({})
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get("/warehouses").then((res) => {
            const active = (res.data.data || []).filter((w) => w.isActive)
            setWarehouses(active)
            const main = active.find((w) => w.isDefault) || active[0]
            if (main) setWarehouseId(main._id)
        }).catch(() => setError("Unable to load warehouses"))
    }, [])

    const remaining = (i) => i.quantity - i.receivedQuantity

    function receiveAll() {
        const all = {}
        order.items.forEach((i) => { if (remaining(i) > 0) all[i._id] = String(remaining(i)) })
        setQty(all)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        const lines = []
        for (const item of order.items) {
            const raw = qty[item._id]
            if (raw === undefined || raw === "") continue
            const n = Number(raw)
            if (!Number.isInteger(n) || n < 0) return setError(`${item.product?.name}: quantity must be a whole number, 0 or more`)
            if (n > remaining(item)) return setError(`${item.product?.name}: only ${remaining(item)} remaining`)
            if (n > 0) lines.push({ itemId: item._id, quantity: n })
        }
        if (lines.length === 0) return setError("Enter a received quantity for at least one item")
        setSaving(true)
        try {
            const res = await api.post(`/purchase-orders/${order._id}/receive`, { warehouseId, items: lines })
            onSaved(res.data.data)
        } catch (err) {
            setError(getErrorMessage(err, "Unable to receive stock"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalBox} ${styles.modalWide}`}>
                <h3 className={styles.modalTitle}>Receive Stock — {order.poNumber}</h3>
                <form onSubmit={handleSubmit} noValidate>
                    <div className={styles.formRow}>
                        <label>Receive Into Warehouse</label>
                        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                            {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                        </select>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Product</th><th>Ordered</th><th>Received</th><th>Remaining</th><th>Receive now</th></tr>
                            </thead>
                            <tbody>
                                {order.items.map((i) => (
                                    <tr key={i._id}>
                                        <td>{i.product?.name || "Deleted product"}</td>
                                        <td className={styles.mono}>{i.quantity}</td>
                                        <td className={styles.mono}>{i.receivedQuantity}</td>
                                        <td className={styles.mono}>{remaining(i)}</td>
                                        <td>
                                            <input type="number" min="0" max={remaining(i)} step="1" style={{ width: 90, padding: "6px 8px" }}
                                                disabled={remaining(i) === 0 || !i.product}
                                                value={qty[i._id] ?? ""} onChange={(e) => setQty({ ...qty, [i._id]: e.target.value })} aria-label={`Receive ${i.product?.name}`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {error && <p className={styles.errorText} style={{ marginTop: 12 }}>{error}</p>}

                    <div className={styles.modalActions} style={{ marginTop: 16 }}>
                        <button type="button" className={styles.secondaryBtn} onClick={receiveAll}>Fill remaining</button>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn} disabled={saving || !warehouseId}>{saving ? "Receiving..." : "Receive Stock"}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ReceiveForm
