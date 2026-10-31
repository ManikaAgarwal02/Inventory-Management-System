import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { downloadCsv } from "../../utils/csv"
import StockForm from "../../Components/Stock Component/stockForm"
import { useToast } from "../../Components/Toast/toastContext"

function StockPage() {
    const showToast = useToast()
    const [transactions, setTransactions] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState("")

    async function fetchAll() {
        try {
            const [transactionsRes, productsRes] = await Promise.all([
                api.get("/stock/transactions"),
                api.get("/products")
            ])
            setTransactions(transactionsRes.data.data || [])
            setProducts(productsRes.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load stock ledger"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAll()
    }, [])

    function handleSaved(type) {
        showToast(type === "IN" ? "Stock added" : "Stock removed")
        setShowForm(false)
        fetchAll()
    }

    const term = search.trim().toLowerCase()
    const visibleTransactions = transactions.filter((t) => {
        const productText = t.product ? `${t.product.name} ${t.product.sku}`.toLowerCase() : "deleted product"
        const matchesSearch = !term || productText.includes(term) || (t.note || "").toLowerCase().includes(term)
        const matchesType = !typeFilter || t.type === typeFilter
        return matchesSearch && matchesType
    })

    function handleExport() {
        downloadCsv(
            "stock-ledger.csv",
            ["Product", "SKU", "Type", "Quantity", "Warehouse", "Note", "Performed By", "Date"],
            visibleTransactions.map((t) => [
                t.product ? t.product.name : "Deleted Product",
                t.product ? t.product.sku : "",
                t.type,
                t.quantity,
                t.warehouse ? t.warehouse.name : "",
                t.note || "",
                t.performedBy ? t.performedBy.name : "",
                new Date(t.createdAt).toLocaleString()
            ])
        )
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Stock Ledger</h1>
                        <p className={styles.pageSubtitle}>Every stock-in and stock-out transaction</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.secondaryBtn} onClick={handleExport} disabled={visibleTransactions.length === 0}>Export CSV</button>
                        <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>+ Record Movement</button>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={`${styles.formRow} ${styles.toolbarGrow}`}>
                        <label>Search</label>
                        <input placeholder="Product, SKU or note" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className={styles.formRow}>
                        <label>Type</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="">All</option>
                            <option value="IN">Stock In</option>
                            <option value="OUT">Stock Out</option>
                        </select>
                    </div>
                </div>

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={fetchAll}>Retry</button>
                    </div>
                )}

                {loading && <p className={styles.emptyState}>Loading transactions...</p>}

                {!loading && !loadError && visibleTransactions.length === 0 && (
                    <p className={styles.emptyState}>
                        {transactions.length === 0 ? "No stock movements recorded yet." : "No transactions match your filters."}
                    </p>
                )}

                {!loading && visibleTransactions.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Type</th>
                                    <th>Quantity</th>
                                    <th>Warehouse</th>
                                    <th>Note</th>
                                    <th>Performed By</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleTransactions.map((t) => (
                                    <tr key={t._id}>
                                        <td>{t.product ? t.product.name : "Deleted Product"}</td>
                                        <td className={styles.mono}>{t.product ? t.product.sku : "—"}</td>
                                        <td>
                                            <span className={`${styles.badge} ${t.type === "IN" ? styles.badgeIn : styles.badgeOut}`}>{t.type}</span>
                                        </td>
                                        <td className={styles.mono}>{t.quantity}</td>
                                        <td>{t.warehouse ? t.warehouse.name : "—"}</td>
                                        <td>{t.note || "—"}</td>
                                        <td>{t.performedBy ? t.performedBy.name : "—"}</td>
                                        <td>{new Date(t.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showForm && (
                    <StockForm products={products} onClose={() => setShowForm(false)} onSaved={handleSaved} />
                )}
            </div>
        </Layout>
    )
}

export default StockPage
