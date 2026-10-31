import { useEffect, useMemo, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { isAdmin } from "../../utils/auth"
import { useToast } from "../../Components/Toast/toastContext"
import ConfirmDialog from "../../Components/Confirm Dialog/confirmDialog"
import PurchaseOrderForm from "../../Components/Purchase Order Component/purchaseOrderForm"
import ReceiveForm from "../../Components/Purchase Order Component/receiveForm"

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`
const statusBadge = (s) => ({
    "Draft": styles.badgeNeutral, "Ordered": styles.badgeInfo, "Partially Received": styles.badgeWarn,
    "Received": styles.badgeOk, "Cancelled": styles.badgeLow
}[s])

function PurchaseOrdersPage() {
    const showToast = useToast()
    const [orders, setOrders] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [search, setSearch] = useState("")
    const [form, setForm] = useState(null)         // { order } -> create/edit modal
    const [viewing, setViewing] = useState(null)
    const [receiving, setReceiving] = useState(null)
    const [confirm, setConfirm] = useState(null)   // { type: "cancel" | "delete", order }

    async function fetchAll() {
        try {
            const [o, s, p] = await Promise.all([api.get("/purchase-orders"), api.get("/suppliers"), api.get("/products")])
            setOrders(o.data.data || [])
            setSuppliers(s.data.data || [])
            setProducts(p.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load purchase orders"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAll()
    }, [])

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase()
        return orders.filter((o) =>
            (!statusFilter || o.status === statusFilter) &&
            (!term || o.poNumber.toLowerCase().includes(term) || (o.supplier?.name || "").toLowerCase().includes(term)))
    }, [orders, search, statusFilter])

    async function placeOrder(order) {
        try {
            await api.post(`/purchase-orders/${order._id}/order`)
            showToast(`${order.poNumber} placed`)
            fetchAll()
        } catch (error) {
            showToast(getErrorMessage(error, "Unable to place order"), "error")
        }
    }

    async function runConfirm() {
        const { type, order } = confirm
        try {
            if (type === "cancel") await api.post(`/purchase-orders/${order._id}/cancel`)
            else await api.delete(`/purchase-orders/${order._id}`)
            showToast(type === "cancel" ? `${order.poNumber} cancelled` : `${order.poNumber} deleted`)
            fetchAll()
        } catch (error) {
            showToast(getErrorMessage(error, "Action failed"), "error")
        } finally {
            setConfirm(null)
        }
    }

    function handleSaved(kind, placed) {
        showToast(placed ? "Purchase order placed" : `Purchase order ${kind}`)
        setForm(null)
        fetchAll()
    }

    function handleReceived(updated) {
        showToast(updated.status === "Received" ? "Order fully received — inventory updated" : "Stock received — inventory updated")
        setReceiving(null)
        fetchAll()
    }

    const canCancel = (o) => ["Draft", "Ordered"].includes(o.status)

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Purchase Orders</h1>
                        <p className={styles.pageSubtitle}>Order from suppliers and receive stock against each order</p>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => setForm({ order: null })}>+ New Purchase Order</button>
                </div>

                <div className={styles.toolbar}>
                    <div className={`${styles.formRow} ${styles.toolbarGrow}`}>
                        <label>Search</label>
                        <input placeholder="PO number or supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className={styles.formRow}>
                        <label>Status</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All</option>
                            {["Draft", "Ordered", "Partially Received", "Received", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {loadError && (
                    <div className={styles.errorBox}><span>{loadError}</span><button className={styles.secondaryBtn} onClick={fetchAll}>Retry</button></div>
                )}
                {loading && <p className={styles.emptyState}>Loading purchase orders...</p>}
                {!loading && !loadError && visible.length === 0 && (
                    <p className={styles.emptyState}>{orders.length === 0 ? "No purchase orders yet. Create your first one to start ordering stock." : "No purchase orders match your filters."}</p>
                )}

                {!loading && visible.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>PO #</th><th>Supplier</th><th>Items</th><th>Received</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {visible.map((o) => {
                                    const ordered = o.items.reduce((s, i) => s + i.quantity, 0)
                                    const received = o.items.reduce((s, i) => s + i.receivedQuantity, 0)
                                    return (
                                        <tr key={o._id}>
                                            <td className={styles.mono}>{o.poNumber}</td>
                                            <td>{o.supplier?.name || "—"}</td>
                                            <td>{o.items.length}</td>
                                            <td className={styles.mono}>{received} / {ordered}</td>
                                            <td className={styles.mono}>{rupees(o.total)}</td>
                                            <td><span className={`${styles.badge} ${statusBadge(o.status)}`}>{o.status}</span></td>
                                            <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                            <td className={styles.actionsCell} style={{ flexWrap: "wrap" }}>
                                                <button className={styles.linkBtn} onClick={() => setViewing(o)}>View</button>
                                                {o.status === "Draft" && <button className={styles.linkBtn} onClick={() => setForm({ order: o })}>Edit</button>}
                                                {o.status === "Draft" && <button className={styles.linkBtn} onClick={() => placeOrder(o)}>Place</button>}
                                                {["Ordered", "Partially Received"].includes(o.status) && <button className={styles.linkBtn} onClick={() => setReceiving(o)}>Receive</button>}
                                                {canCancel(o) && <button className={styles.deleteBtn} onClick={() => setConfirm({ type: "cancel", order: o })}>Cancel</button>}
                                                {isAdmin() && ["Draft", "Cancelled"].includes(o.status) && <button className={styles.deleteBtn} onClick={() => setConfirm({ type: "delete", order: o })}>Delete</button>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {form && (
                    <PurchaseOrderForm order={form.order} suppliers={suppliers} products={products} onClose={() => setForm(null)} onSaved={handleSaved} />
                )}
                {receiving && <ReceiveForm order={receiving} onClose={() => setReceiving(null)} onSaved={handleReceived} />}

                {viewing && (
                    <div className={styles.modalOverlay} onClick={() => setViewing(null)}>
                        <div className={`${styles.modalBox} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>{viewing.poNumber} <span className={`${styles.badge} ${statusBadge(viewing.status)}`} style={{ verticalAlign: "middle", marginLeft: 8 }}>{viewing.status}</span></h3>
                            <div className={styles.listRow}><span className={styles.mutedText}>Supplier</span><span>{viewing.supplier?.name || "—"}</span></div>
                            <div className={styles.listRow}><span className={styles.mutedText}>Created</span><span>{new Date(viewing.createdAt).toLocaleString()}{viewing.createdBy ? ` by ${viewing.createdBy.name}` : ""}</span></div>
                            {viewing.expectedDate && <div className={styles.listRow}><span className={styles.mutedText}>Expected</span><span>{new Date(viewing.expectedDate).toLocaleDateString()}</span></div>}
                            {viewing.notes && <div className={styles.listRow}><span className={styles.mutedText}>Notes</span><span>{viewing.notes}</span></div>}
                            <div className={styles.tableWrap} style={{ marginTop: 14 }}>
                                <table className={styles.table}>
                                    <thead><tr><th>Product</th><th>Ordered</th><th>Received</th><th>Remaining</th><th>Price</th><th>Line total</th></tr></thead>
                                    <tbody>
                                        {viewing.items.map((i) => (
                                            <tr key={i._id}>
                                                <td>{i.product ? `${i.product.name} (${i.product.sku})` : "Deleted product"}</td>
                                                <td className={styles.mono}>{i.quantity}</td>
                                                <td className={styles.mono}>{i.receivedQuantity}</td>
                                                <td className={styles.mono}>{i.quantity - i.receivedQuantity}</td>
                                                <td className={styles.mono}>{rupees(i.unitPrice)}</td>
                                                <td className={styles.mono}>{rupees(i.quantity * i.unitPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className={styles.totalBar}><span className={styles.mutedText}>Order total</span><strong>{rupees(viewing.total)}</strong></div>
                            <div className={styles.modalActions}><button className={styles.secondaryBtn} onClick={() => setViewing(null)}>Close</button></div>
                        </div>
                    </div>
                )}

                {confirm && (
                    <ConfirmDialog
                        title={confirm.type === "cancel" ? "Cancel purchase order?" : "Delete purchase order?"}
                        message={confirm.type === "cancel" ? `${confirm.order.poNumber} will be marked as cancelled. This cannot be undone.` : `${confirm.order.poNumber} will be permanently deleted.`}
                        confirmText={confirm.type === "cancel" ? "Cancel Order" : "Delete"}
                        onConfirm={runConfirm}
                        onCancel={() => setConfirm(null)}
                    />
                )}
            </div>
        </Layout>
    )
}

export default PurchaseOrdersPage
