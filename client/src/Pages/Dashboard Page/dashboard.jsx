import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { getUser } from "../../utils/auth"

function Dashboard() {
    const user = getUser()
    const [stats, setStats] = useState(null)
    const [pendingRequests, setPendingRequests] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    async function fetchStats() {
        try {
            const [statsRes, requestsRes] = await Promise.all([
                api.get("/dashboard/stats"),
                api.get("/stock-requests?status=Pending").catch(() => ({ data: { data: [] } }))
            ])
            setStats(statsRes.data.data)
            setPendingRequests((requestsRes.data?.data || []).length)
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load dashboard"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={fetchStats}>Retry</button>
                    </div>
                )}

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
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Out of Stock</p>
                                <p className={`${styles.statValue} ${stats.outOfStockProducts > 0 ? styles.statValueAlert : ""}`}>{stats.outOfStockProducts}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Staff Requests</p>
                                <p className={`${styles.statValue} ${pendingRequests > 0 ? styles.statValueAlert : ""}`}>
                                    <Link to="/admin/requests" style={{ textDecoration: "none", color: "inherit" }}>
                                        {pendingRequests} <span style={{ fontSize: "14px", fontWeight: "normal", color: "#6e7681" }}>pending</span>
                                    </Link>
                                </p>
                            </div>
                        </div>

                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Needs Reordering</h3>
                                {stats.lowStockPreview.length === 0 && (
                                    <p className={styles.emptyState}>All products are above their reorder level.</p>
                                )}
                                {stats.lowStockPreview.map((p) => (
                                    <div key={p._id} className={styles.listRow}>
                                        <div>
                                            <div>{p.name}</div>
                                            <div className={styles.listSub}>{p.sku} · reorder at {p.reorderLevel}</div>
                                        </div>
                                        <span className={`${styles.mono} ${styles.dangerText}`}>{p.quantity} {p.unit}</span>
                                    </div>
                                ))}
                                {stats.lowStockProducts > 0 && (
                                    <p className={styles.listSub} style={{ marginBottom: 0, marginTop: 12 }}>
                                        <Link to="/alerts">View all {stats.lowStockProducts} alerts</Link>
                                    </p>
                                )}
                            </div>

                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Last 7 Days</h3>
                                <div className={styles.listRow}>
                                    <span>Units received</span>
                                    <span className={`${styles.badge} ${styles.badgeIn}`}>+{stats.weeklyMovement.inUnits}</span>
                                </div>
                                <div className={styles.listRow}>
                                    <span>Units issued</span>
                                    <span className={`${styles.badge} ${styles.badgeOut}`}>-{stats.weeklyMovement.outUnits}</span>
                                </div>
                                <div className={styles.listRow}>
                                    <span>Transactions</span>
                                    <span className={styles.mono}>{stats.weeklyMovement.transactions}</span>
                                </div>
                            </div>
                        </div>

                        {(stats.dailyMovement || stats.topMovedProducts) && (
                            <div className={styles.twoCol}>
                                <div className={styles.card}>
                                    <h3 className={styles.cardTitle}>Stock Trend (7 days)</h3>
                                    {(() => {
                                        const days = stats.dailyMovement || []
                                        const peak = Math.max(1, ...days.flatMap((d) => [d.inUnits, d.outUnits]))
                                        return (
                                            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                                                {days.map((d) => (
                                                    <div key={d.date} style={{ flex: 1, textAlign: "center" }} title={`${d.date}: +${d.inUnits} in, -${d.outUnits} out`}>
                                                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: 96 }}>
                                                            <div style={{ width: 10, height: `${(d.inUnits / peak) * 100}%`, minHeight: d.inUnits ? 2 : 0, background: "#2da44e" }} />
                                                            <div style={{ width: 10, height: `${(d.outUnits / peak) * 100}%`, minHeight: d.outUnits ? 2 : 0, background: "#cf222e" }} />
                                                        </div>
                                                        <div className={styles.listSub}>{d.date.slice(5)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                    <p className={styles.listSub} style={{ marginBottom: 0, marginTop: 8 }}>Green = received, red = issued</p>
                                </div>

                                <div className={styles.card}>
                                    <h3 className={styles.cardTitle}>Top Moving (30 days)</h3>
                                    {(!stats.topMovedProducts || stats.topMovedProducts.length === 0) && (
                                        <p className={styles.emptyState}>No stock-outs recorded in the last 30 days.</p>
                                    )}
                                    {(stats.topMovedProducts || []).map((p) => (
                                        <div key={p.sku} className={styles.listRow}>
                                            <div>
                                                <div>{p.name}</div>
                                                <div className={styles.listSub}>{p.sku}</div>
                                            </div>
                                            <span className={styles.mono}>{p.units} out</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>Recent Stock Movements</h3>
                            {stats.recentTransactions.length === 0 && (
                                <p className={styles.emptyState}>No stock movements recorded yet.</p>
                            )}
                            {stats.recentTransactions.length > 0 && (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Type</th>
                                                <th>Quantity</th>
                                                <th>By</th>
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
                                                    <td>{t.performedBy ? t.performedBy.name : "—"}</td>
                                                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    )
}

export default Dashboard
