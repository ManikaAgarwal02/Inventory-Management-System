import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { isAdmin } from "../../utils/auth"
import { useToast } from "../../Components/Toast/toastContext"
import ConfirmDialog from "../../Components/Confirm Dialog/confirmDialog"

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`

function WarehousesPage() {
    const showToast = useToast()
    const [warehouses, setWarehouses] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [editing, setEditing] = useState(null)       // null | {} (new) | warehouse
    const [form, setForm] = useState({ name: "", code: "", location: "" })
    const [formError, setFormError] = useState("")
    const [saving, setSaving] = useState(false)
    const [inventory, setInventory] = useState(null)   // { warehouse, items } | { loading }
    const [toggle, setToggle] = useState(null)

    async function fetchAll() {
        try {
            const res = await api.get("/warehouses")
            setWarehouses(res.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load warehouses"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAll()
    }, [])

    function openForm(w) {
        setEditing(w || {})
        setForm({ name: w?.name || "", code: w?.code || "", location: w?.location || "" })
        setFormError("")
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setFormError("")
        if (!form.name.trim()) return setFormError("Warehouse name is required")
        setSaving(true)
        try {
            if (editing._id) await api.put(`/warehouses/${editing._id}`, form)
            else await api.post("/warehouses", form)
            showToast(editing._id ? "Warehouse updated" : "Warehouse added")
            setEditing(null)
            fetchAll()
        } catch (error) {
            setFormError(getErrorMessage(error, "Unable to save warehouse"))
        } finally {
            setSaving(false)
        }
    }

    async function viewInventory(w) {
        setInventory({ warehouse: w, loading: true, items: [] })
        try {
            const res = await api.get(`/warehouses/${w._id}/inventory`)
            setInventory({ ...res.data.data, loading: false })
        } catch (error) {
            setInventory(null)
            showToast(getErrorMessage(error, "Unable to load inventory"), "error")
        }
    }

    async function confirmToggle() {
        try {
            await api.patch(`/warehouses/${toggle._id}/active`, { isActive: !toggle.isActive })
            showToast(toggle.isActive ? "Warehouse deactivated" : "Warehouse activated")
            fetchAll()
        } catch (error) {
            showToast(getErrorMessage(error, "Unable to update warehouse"), "error")
        } finally {
            setToggle(null)
        }
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Warehouses</h1>
                        <p className={styles.pageSubtitle}>Locations where your stock is kept</p>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => openForm(null)}>+ Add Warehouse</button>
                </div>

                {loadError && <div className={styles.errorBox}><span>{loadError}</span><button className={styles.secondaryBtn} onClick={fetchAll}>Retry</button></div>}
                {loading && <p className={styles.emptyState}>Loading warehouses...</p>}
                {!loading && !loadError && warehouses.length === 0 && <p className={styles.emptyState}>No warehouses yet.</p>}

                {!loading && warehouses.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead><tr><th>Warehouse</th><th>Code</th><th>Location</th><th>Products</th><th>Units</th><th>Stock Value</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {warehouses.map((w) => (
                                    <tr key={w._id}>
                                        <td>{w.name}{w.isDefault && <span className={`${styles.badge} ${styles.badgeNeutral}`} style={{ marginLeft: 8 }}>Default</span>}</td>
                                        <td className={styles.mono}>{w.code || "—"}</td>
                                        <td>{w.location || "—"}</td>
                                        <td className={styles.mono}>{w.productCount}</td>
                                        <td className={styles.mono}>{w.totalUnits}</td>
                                        <td className={styles.mono}>{rupees(w.stockValue)}</td>
                                        <td><span className={`${styles.badge} ${w.isActive ? styles.badgeOk : styles.badgeNeutral}`}>{w.isActive ? "Active" : "Inactive"}</span></td>
                                        <td className={styles.actionsCell}>
                                            <button className={styles.linkBtn} onClick={() => viewInventory(w)}>Inventory</button>
                                            <button className={styles.linkBtn} onClick={() => openForm(w)}>Edit</button>
                                            {isAdmin() && !w.isDefault && (
                                                <button className={w.isActive ? styles.deleteBtn : styles.linkBtn} onClick={() => w.isActive ? setToggle(w) : api.patch(`/warehouses/${w._id}/active`, { isActive: true }).then(() => { showToast("Warehouse activated"); fetchAll() }).catch((e) => showToast(getErrorMessage(e), "error"))}>
                                                    {w.isActive ? "Deactivate" : "Activate"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {editing && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalBox}>
                            <h3 className={styles.modalTitle}>{editing._id ? "Edit Warehouse" : "Add Warehouse"}</h3>
                            <form onSubmit={handleSubmit} noValidate>
                                <div className={styles.formRow}><label>Name</label><input value={form.name} maxLength="80" onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathura Warehouse" /></div>
                                <div className={styles.formRow}><label>Code (optional)</label><input value={form.code} maxLength="12" onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MTH" /></div>
                                <div className={styles.formRow}><label>Location (optional)</label><input value={form.location} maxLength="200" onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City / address" /></div>
                                {formError && <p className={styles.errorText}>{formError}</p>}
                                <div className={styles.modalActions}>
                                    <button type="button" className={styles.secondaryBtn} onClick={() => setEditing(null)}>Cancel</button>
                                    <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {inventory && (
                    <div className={styles.modalOverlay} onClick={() => setInventory(null)}>
                        <div className={`${styles.modalBox} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>{inventory.warehouse.name} — Inventory</h3>
                            {inventory.loading && <p className={styles.emptyState}>Loading...</p>}
                            {!inventory.loading && inventory.items.length === 0 && <p className={styles.emptyState}>No stock in this warehouse yet. Receive a purchase order or transfer stock here.</p>}
                            {!inventory.loading && inventory.items.length > 0 && (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {inventory.items.map((r) => (
                                                <tr key={r._id}>
                                                    <td>{r.product.name}</td>
                                                    <td className={styles.mono}>{r.product.sku}</td>
                                                    <td className={styles.mono}>{r.quantity} {r.product.unit}</td>
                                                    <td><span className={`${styles.badge} ${r.lowStock ? styles.badgeWarn : styles.badgeOk}`}>{r.lowStock ? "Low Stock" : "In Stock"}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className={styles.modalActions} style={{ marginTop: 16 }}><button className={styles.secondaryBtn} onClick={() => setInventory(null)}>Close</button></div>
                        </div>
                    </div>
                )}

                {toggle && (
                    <ConfirmDialog title="Deactivate warehouse?" confirmText="Deactivate"
                        message={`${toggle.name} will no longer be offered for receiving, stock movements or transfers. Its existing stock stays recorded.`}
                        onConfirm={confirmToggle} onCancel={() => setToggle(null)} />
                )}
            </div>
        </Layout>
    )
}

export default WarehousesPage
