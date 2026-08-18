import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import { getUser } from "../../utils/auth"

function Dashboard() {
    const user = getUser()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    async function fetchStats() {
        try {
            setLoading(true)
            const response = await api.get("/dashboard/stats")
            setStats(response.data.data)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Welcome back{user ? `, ${user.name}` : ""}</h1>
                        <p className={styles.pageSubtitle}>Here's what's happening in your stockroom today</p>
                    </div>
                </div>

                {loading && <p className={styles.emptyState}>Loading dashboard...</p>}

                {!loading && stats && (
                    <>
                        <div className={styles.statGrid}>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Total Products</p>
                                <p className={styles.statValue}>{stats.totalProducts}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Units In Stock</p>
                                <p className={styles.statValue}>{stats.totalStockUnits}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Stock Value</p>
                                <p className={styles.statValue}>₹{stats.totalStockValue.toLocaleString("en-IN")}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Suppliers</p>
                                <p className={styles.statValue}>{stats.totalSuppliers}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Low Stock Items</p>
                                <p className={`${styles.statValue} ${stats.lowStockProducts > 0 ? styles.statValueAlert : ""}`}>{stats.lowStockProducts}</p>
                            </div>
                        </div>

                        <div className={styles.card}>
                            <h3 style={{ marginTop: 0 }}>Recent Stock Movements</h3>
                            {stats.recentTransactions.length === 0 && (
                                <p className={styles.emptyState}>No stock movements recorded yet.</p>
                            )}
                            {stats.recentTransactions.length > 0 && (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Type</th>
                                            <th>Quantity</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentTransactions.map((t) => (
                                            <tr key={t._id}>
                                                <td>{t.product ? t.product.name : "Deleted Product"}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${t.type === "IN" ? styles.badgeIn : styles.badgeOut}`}>{t.type}</span>
                                                </td>
                                                <td className={styles.mono}>{t.quantity}</td>
                                                <td>{new Date(t.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    )
}

export default Dashboard
