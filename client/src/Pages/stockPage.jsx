import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import StockForm from "../../Components/Stock Component/stockForm"

function StockPage() {
    const [transactions, setTransactions] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)

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
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    function handleSaved() {
        setShowForm(false)
        fetchAll()
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Stock Ledger</h1>
                        <p className={styles.pageSubtitle}>Every stock-in and stock-out transaction</p>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>+ Record Movement</button>
                </div>

                {loading && <p className={styles.emptyState}>Loading transactions...</p>}

                {!loading && transactions.length === 0 && (
                    <p className={styles.emptyState}>No stock movements recorded yet.</p>
                )}

                {!loading && transactions.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Note</th>
                                <th>Performed By</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t) => (
                                <tr key={t._id}>
                                    <td>{t.product ? t.product.name : "Deleted Product"}</td>
                                    <td className={styles.mono}>{t.product ? t.product.sku : "—"}</td>
                                    <td>
                                        <span className={`${styles.badge} ${t.type === "IN" ? styles.badgeIn : styles.badgeOut}`}>{t.type}</span>
                                    </td>
                                    <td className={styles.mono}>{t.quantity}</td>
                                    <td>{t.note || "—"}</td>
                                    <td>{t.performedBy ? t.performedBy.name : "—"}</td>
                                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {showForm && (
                    <StockForm products={products} onClose={() => setShowForm(false)} onSaved={handleSaved} />
                )}
            </div>
        </Layout>
    )
}

export default StockPage
