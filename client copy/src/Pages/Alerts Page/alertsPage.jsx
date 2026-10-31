import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { downloadCsv } from "../../utils/csv"
import StockForm from "../../Components/Stock Component/stockForm"
import { useToast } from "../../Components/Toast/toastContext"

// Suggest enough stock to get back to twice the reorder level.
function suggestedQuantity(p) {
    return Math.max(p.reorderLevel * 2 - p.quantity, 1)
}

function AlertsPage() {
    const showToast = useToast()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [restockProduct, setRestockProduct] = useState(null)

    async function fetchLowStock() {
        try {
            const response = await api.get("/products/low-stock")
            setProducts(response.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load alerts"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLowStock()
    }, [])

    function handleSaved() {
        showToast("Stock added")
        setRestockProduct(null)
        fetchLowStock()
    }

    function handleExport() {
        downloadCsv(
            "reorder-list.csv",
            ["Product", "SKU", "Supplier", "Current Quantity", "Reorder Level", "Suggested Order"],
            products.map((p) => [p.name, p.sku, p.supplier?.name || "", p.quantity, p.reorderLevel, suggestedQuantity(p)])
        )
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Low Stock Alerts</h1>
                        <p className={styles.pageSubtitle}>Products at or below their reorder level</p>
                    </div>
                    <button className={styles.secondaryBtn} onClick={handleExport} disabled={products.length === 0}>Export Reorder List</button>
                </div>

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={fetchLowStock}>Retry</button>
                    </div>
                )}

                {loading && <p className={styles.emptyState}>Checking stock levels...</p>}

                {!loading && !loadError && products.length === 0 && (
                    <p className={styles.emptyState}>Nothing to reorder right now — all products are well stocked.</p>
                )}

                {!loading && products.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Supplier</th>
                                    <th>Current Quantity</th>
                                    <th>Reorder Level</th>
                                    <th>Suggested Order</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p._id}>
                                        <td>{p.name}</td>
                                        <td className={styles.mono}>{p.sku}</td>
                                        <td>{p.category ? p.category.name : "—"}</td>
                                        <td>{p.supplier ? p.supplier.name : "—"}</td>
                                        <td className={`${styles.mono} ${styles.dangerText}`}>{p.quantity} {p.unit}</td>
                                        <td className={styles.mono}>{p.reorderLevel} {p.unit}</td>
                                        <td className={styles.mono}>{suggestedQuantity(p)} {p.unit}</td>
                                        <td><button className={styles.linkBtn} onClick={() => setRestockProduct(p)}>Restock</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {restockProduct && (
                    <StockForm
                        products={products}
                        defaultProductId={restockProduct._id}
                        defaultType="IN"
                        defaultQuantity={suggestedQuantity(restockProduct)}
                        onClose={() => setRestockProduct(null)}
                        onSaved={handleSaved}
                    />
                )}
            </div>
        </Layout>
    )
}

export default AlertsPage
