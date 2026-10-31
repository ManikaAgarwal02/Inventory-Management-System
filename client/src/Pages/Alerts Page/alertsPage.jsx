import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import StockForm from "../../Components/Stock Component/stockForm"
import Toast from "../../Components/Toast/Toast"

function AlertsPage() {
    const [products, setProducts] = useState([])
    const [allProducts, setAllProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [restockingProduct, setRestockingProduct] = useState(null)
    const [toast, setToast] = useState({ message: "", type: "info" })

    async function fetchLowStock() {
        try {
            setLoading(true)
            const [lowRes, allRes] = await Promise.all([
                api.get("/products/low-stock"),
                api.get("/products")
            ])
            setProducts(lowRes.data.data || [])
            setAllProducts(allRes.data.data || [])
        } catch (error) {
            console.log("Error loading low stock alerts:", error)
            setToast({
                message: error.response?.data?.message || "Failed to load low stock alerts",
                type: "error"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLowStock()
    }, [])

    function handleOpenRestock(product, suggestedQty) {
        setRestockingProduct({
            ...product,
            suggestedQty
        })
    }

    function handleRestockSaved() {
        setRestockingProduct(null)
        setToast({ message: "Stock replenished successfully!", type: "success" })
        fetchLowStock()
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Low Stock & Restock Alerts</h1>
                        <p className={styles.pageSubtitle}>
                            {products.length} products currently at or below their reorder threshold
                        </p>
                    </div>
                </div>

                {loading && <p className={styles.emptyState}>Evaluating stock levels across inventory...</p>}

                {!loading && products.length === 0 && (
                    <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                        <h3 style={{ margin: "0 0 6px 0", color: "#1a7f37" }}>Inventory is Healthy</h3>
                        <p style={{ color: "#6e7681", fontSize: 14, margin: 0 }}>
                            All products are currently well-stocked above their respective reorder levels.
                        </p>
                    </div>
                )}

                {!loading && products.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Supplier</th>
                                <th>Current Stock</th>
                                <th>Reorder Level</th>
                                <th>Status</th>
                                <th>Smart Restock Recommendation</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => {
                                const isOut = p.quantity === 0
                                // FEATURE 1: SMART RESTOCK SUGGESTION
                                // Formula: Suggested Order = (Reorder Level * 2) - Current Quantity
                                const suggestedQty = Math.max(1, (p.reorderLevel * 2) - p.quantity)

                                return (
                                    <tr key={p._id}>
                                        <td>
                                            <strong>{p.name}</strong>
                                            <div style={{ fontSize: 11, color: "#6e7681" }}>{p.category ? p.category.name : "Uncategorized"}</div>
                                        </td>
                                        <td className={styles.mono}>{p.sku}</td>
                                        <td>{p.supplier ? p.supplier.name : "—"}</td>
                                        <td className={styles.mono}>
                                            <strong style={{ color: isOut ? "#cf222e" : "#9a6700" }}>
                                                {p.quantity} {p.unit}
                                            </strong>
                                        </td>
                                        <td className={styles.mono}>{p.reorderLevel} {p.unit}</td>
                                        <td>
                                            {isOut ? (
                                                <span className={`${styles.badge} ${styles.badgeOutOfStock}`}>
                                                    ● Out of Stock
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${styles.badgeLow}`}>
                                                    ▲ Low Stock
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.restockCard}>
                                                <span>💡 Suggested: <strong>+{suggestedQty} {p.unit}</strong></span>
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className={styles.primaryBtn}
                                                style={{ padding: "6px 12px", fontSize: 12 }}
                                                onClick={() => handleOpenRestock(p, suggestedQty)}
                                            >
                                                + Restock
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}

                {/* Stock In modal pre-filled for the restocked product */}
                {restockingProduct && (
                    <StockForm
                        products={allProducts}
                        initialProductId={restockingProduct._id}
                        initialQuantity={restockingProduct.suggestedQty}
                        onClose={() => setRestockingProduct(null)}
                        onSaved={handleRestockSaved}
                    />
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

export default AlertsPage
