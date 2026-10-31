import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { useToast } from "../../Components/Toast/toastContext"

function TransfersPage() {
    const showToast = useToast()
    const [transfers, setTransfers] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [products, setProducts] = useState([])
    const [available, setAvailable] = useState(null)   // units of chosen product in source warehouse
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ fromWarehouse: "", toWarehouse: "", product: "", quantity: "", note: "" })
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    async function fetchAll() {
        try {
            const [t, w, p] = await Promise.all([api.get("/transfers"), api.get("/warehouses"), api.get("/products")])
            setTransfers(t.data.data || [])
            setWarehouses(w.data.data || [])
            setProducts(p.data.data || [])
            setLoadError("")
        } catch (err) {
            setLoadError(getErrorMessage(err, "Unable to load transfers"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAll()
    }, [])

    // show how much of the product the source warehouse holds
    useEffect(() => {
        if (!form.fromWarehouse || !form.product) return
        let cancelled = false
        api.get(`/warehouses/${form.fromWarehouse}/inventory`).then((res) => {
            if (cancelled) return
            const row = (res.data.data.items || []).find((i) => i.product._id === form.product)
            setAvailable(row ? row.quantity : 0)
        }).catch(() => { if (!cancelled) setAvailable(null) })
        return () => { cancelled = true }
    }, [form.fromWarehouse, form.product])

    function change(e) {
        const next = { ...form, [e.target.name]: e.target.value }
        setForm(next)
        if (!next.fromWarehouse || !next.product) setAvailable(null)
    }

    const activeWarehouses = warehouses.filter((w) => w.isActive)
    const selectedProduct = products.find((p) => p._id === form.product)

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        const quantity = Number(form.quantity)
        if (!form.fromWarehouse || !form.toWarehouse || !form.product) return setError("Select source, destination and product")
        if (form.fromWarehouse === form.toWarehouse) return setError("Source and destination must be different")
        if (!Number.isInteger(quantity) || quantity < 1) return setError("Quantity must be a whole number of at least 1")
        if (available !== null && quantity > available) return setError(`Only ${available} available in the source warehouse`)
        setSaving(true)
        try {
            await api.post("/transfers", { ...form, quantity })
            showToast("Stock transferred")
            setShowForm(false)
            setAvailable(null)
            setForm({ fromWarehouse: "", toWarehouse: "", product: "", quantity: "", note: "" })
            fetchAll()
        } catch (err) {
            setError(getErrorMessage(err, "Unable to transfer stock"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Stock Transfers</h1>
                        <p className={styles.pageSubtitle}>Move stock between warehouses</p>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => { setError(""); setShowForm(true) }} disabled={activeWarehouses.length < 2}>+ New Transfer</button>
                </div>

                {!loading && activeWarehouses.length < 2 && (
                    <div className={styles.errorBox}><span>You need at least two active warehouses to transfer stock. Add one on the Warehouses page.</span></div>
                )}
                {loadError && <div className={styles.errorBox}><span>{loadError}</span><button className={styles.secondaryBtn} onClick={fetchAll}>Retry</button></div>}
                {loading && <p className={styles.emptyState}>Loading transfers...</p>}
                {!loading && !loadError && transfers.length === 0 && <p className={styles.emptyState}>No transfers yet.</p>}

                {!loading && transfers.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead><tr><th>Transfer</th><th>Product</th><th>From</th><th>To</th><th>Qty</th><th>Status</th><th>By</th><th>Date</th></tr></thead>
                            <tbody>
                                {transfers.map((t) => (
                                    <tr key={t._id}>
                                        <td className={styles.mono}>{t.transferNumber}</td>
                                        <td>{t.product ? `${t.product.name} (${t.product.sku})` : "Deleted product"}</td>
                                        <td>{t.fromWarehouse?.name || "—"}</td>
                                        <td>{t.toWarehouse?.name || "—"}</td>
                                        <td className={styles.mono}>{t.quantity}</td>
                                        <td><span className={`${styles.badge} ${t.status === "Completed" ? styles.badgeOk : t.status === "Pending" ? styles.badgeWarn : styles.badgeLow}`}>{t.status}</span></td>
                                        <td>{t.performedBy?.name || "—"}</td>
                                        <td>{new Date(t.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showForm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalBox}>
                            <h3 className={styles.modalTitle}>New Stock Transfer</h3>
                            <form onSubmit={handleSubmit} noValidate>
                                <div className={styles.formRow}>
                                    <label>From Warehouse</label>
                                    <select name="fromWarehouse" value={form.fromWarehouse} onChange={change}>
                                        <option value="">Select source</option>
                                        {activeWarehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formRow}>
                                    <label>To Warehouse</label>
                                    <select name="toWarehouse" value={form.toWarehouse} onChange={change}>
                                        <option value="">Select destination</option>
                                        {activeWarehouses.filter((w) => w._id !== form.fromWarehouse).map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formRow}>
                                    <label>Product</label>
                                    <select name="product" value={form.product} onChange={change}>
                                        <option value="">Select product</option>
                                        {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                    {available !== null && <span className={styles.mutedText}>{available} {selectedProduct?.unit || ""} available in source warehouse</span>}
                                </div>
                                <div className={styles.formRow}>
                                    <label>Quantity</label>
                                    <input type="number" min="1" step="1" name="quantity" value={form.quantity} onChange={change} />
                                </div>
                                <div className={styles.formRow}>
                                    <label>Note (optional)</label>
                                    <input name="note" maxLength="500" value={form.note} onChange={change} />
                                </div>
                                {error && <p className={styles.errorText}>{error}</p>}
                                <div className={styles.modalActions}>
                                    <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
                                    <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? "Transferring..." : "Transfer Stock"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default TransfersPage
