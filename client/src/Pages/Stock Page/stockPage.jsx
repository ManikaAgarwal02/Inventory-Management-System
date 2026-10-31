import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import StockForm from "../../Components/Stock Component/stockForm"
import Toast from "../../Components/Toast/Toast"

function StockPage() {
    const [transactions, setTransactions] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [typeFilter, setTypeFilter] = useState("all")
    const [search, setSearch] = useState("")
    const [toast, setToast] = useState({ message: "", type: "info" })

    async function fetchAll() {
        try {
            setLoading(true)
            const [transactionsRes, productsRes] = await Promise.all([
                api.get("/stock/transactions"),
                api.get("/products")
            ])
            setTransactions(transactionsRes.data.data || [])
            setProducts(productsRes.data.data || [])
        } catch (error) {
            console.log("Error loading transactions:", error)
            setToast({
                message: error.response?.data?.message || "Failed to load transactions",
                type: "error"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    function handleSaved() {
        setShowForm(false)
        setToast({ message: "Stock movement recorded in audit ledger!", type: "success" })
        fetchAll()
    }

    const filteredTransactions = transactions.filter((t) => {
        const matchesType = typeFilter === "all" || t.type === typeFilter
        const term = search.toLowerCase()
        const productName = t.product ? t.product.name.toLowerCase() : ""
        const productSku = t.product ? t.product.sku.toLowerCase() : ""
        const noteText = t.note ? t.note.toLowerCase() : ""
        const userName = t.performedBy ? t.performedBy.name.toLowerCase() : ""

        const matchesSearch =
            productName.includes(term) ||
            productSku.includes(term) ||
            noteText.includes(term) ||
            userName.includes(term)

        return matchesType && matchesSearch
    })

    const totalIn = transactions.filter((t) => t.type === "IN").reduce((sum, t) => sum + (t.quantity || 0), 0)
    const totalOut = transactions.filter((t) => t.type === "OUT").reduce((sum, t) => sum + (t.quantity || 0), 0)

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Stock Movement Ledger</h1>
                        <p className={styles.pageSubtitle}>
                            Audit trail of incoming shipments and outgoing inventory dispatches
                        </p>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>+ Record Movement</button>
                </div>

                {/* SUMMARY STATS & FILTERS */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <input
                            className={styles.searchInput}
                            placeholder="🔍 Filter by product, SKU, note, or user..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            className={styles.filterSelect}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All Movements ({transactions.length})</option>
                            <option value="IN">Stock In Only (Shipments)</option>
                            <option value="OUT">Stock Out Only (Dispatches)</option>
                        </select>
                    </div>

                    <div className={styles.toolbarRight} style={{ fontSize: 13, color: "#57606a", gap: 12 }}>
                        <span>Total In: <strong style={{ color: "#1a7f37" }}>+{totalIn} units</strong></span>
                        <span>•</span>
                        <span>Total Out: <strong style={{ color: "#cf222e" }}>-{totalOut} units</strong></span>
                    </div>
                </div>

                {loading && <p className={styles.emptyState}>Loading stock ledger...</p>}

                {!loading && filteredTransactions.length === 0 && (
                    <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ margin: "0 0 12px 0", color: "#6e7681", fontSize: 15 }}>
                            {transactions.length === 0
                                ? "No stock movements recorded yet. Record your first shipment or dispatch."
                                : "No stock movements match the filter criteria."}
                        </p>
                        {transactions.length === 0 && (
                            <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>
                                + Record First Movement
                            </button>
                        )}
                    </div>
                )}

                {!loading && filteredTransactions.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Movement Type</th>
                                <th>Quantity</th>
                                <th>Note / Reference</th>
                                <th>Performed By</th>
                                <th>Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((t) => (
                                <tr key={t._id}>
                                    <td>
                                        <strong>{t.product ? t.product.name : "Deleted Product"}</strong>
                                    </td>
                                    <td className={styles.mono}>{t.product ? t.product.sku : "—"}</td>
                                    <td>
                                        <span className={`${styles.badge} ${t.type === "IN" ? styles.badgeIn : styles.badgeOut}`}>
                                            {t.type === "IN" ? "+ Stock In" : "- Stock Out"}
                                        </span>
                                    </td>
                                    <td className={styles.mono}>
                                        <strong>{t.quantity}</strong> {t.product?.unit || ""}
                                    </td>
                                    <td>{t.note || <span style={{ color: "#8c959f" }}>—</span>}</td>
                                    <td>{t.performedBy ? t.performedBy.name : <span style={{ color: "#8c959f" }}>System</span>}</td>
                                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {showForm && (
                    <StockForm products={products} onClose={() => setShowForm(false)} onSaved={handleSaved} />
                )}

                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ message: "", type: "info" })}
                />
            </div>
        </Layout>
    )
}

export default StockPage
