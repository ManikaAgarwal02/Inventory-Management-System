import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"

function AlertsPage() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    async function fetchLowStock() {
        try {
            setLoading(true)
            const response = await api.get("/products/low-stock")
            setProducts(response.data.data || [])
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLowStock()
    }, [])

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Low Stock Alerts</h1>
                        <p className={styles.pageSubtitle}>Products at or below their reorder level</p>
                    </div>
                </div>

                {loading && <p className={styles.emptyState}>Checking stock levels...</p>}

                {!loading && products.length === 0 && (
                    <p className={styles.emptyState}>Nothing to reorder right now — all products are well stocked.</p>
                )}

                {!loading && products.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th>Supplier</th>
                                <th>Current Quantity</th>
                                <th>Reorder Level</th>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Layout>
    )
}

export default AlertsPage
