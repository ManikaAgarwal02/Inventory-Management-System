import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import { getUser } from "../../utils/auth"
import Toast from "../../Components/Toast/Toast"

function Dashboard() {
    const user = getUser()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState({ message: "", type: "info" })

    async function fetchStats() {
        try {
            setLoading(true)
            const response = await api.get("/dashboard/stats")
            setStats(response.data.data)
        } catch (error) {
            console.log("Dashboard stats error:", error)
            setToast({
                message: error.response?.data?.message || "Failed to load dashboard metrics",
                type: "error"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    // SVG Donut calculation helper
    function renderStockDonut() {
        if (!stats) return null
        const total = stats.totalProducts || 0
        if (total === 0) {
            return (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#6e7681", fontSize: 13 }}>
                    No products to visualize yet.
                </div>
            )
        }

        const healthy = stats.healthyStockProducts || 0
        const low = stats.lowStockProducts || 0
        const out = stats.outOfStockProducts || 0

        const healthyPct = Math.round((healthy / total) * 100)
        const lowPct = Math.round((low / total) * 100)
        const outPct = Math.round((out / total) * 100)

        // SVG circle perimeter for r=40 is ~251.3
        const circ = 2 * Math.PI * 40
        const strokeHealthy = (healthy / total) * circ
        const strokeLow = (low / total) * circ
        const strokeOut = (out / total) * circ

        const offsetHealthy = 0
        const offsetLow = -strokeHealthy
        const offsetOut = -(strokeHealthy + strokeLow)

        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 16 }}>
                <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f0f2f5" strokeWidth="16" />
                    {healthy > 0 && (
                        <circle
                            cx="50" cy="50" r="40" fill="transparent"
                            stroke="#2da44e" strokeWidth="16"
                            strokeDasharray={`${strokeHealthy} ${circ}`}
                            strokeDashoffset={offsetHealthy}
                        />
                    )}
                    {low > 0 && (
                        <circle
                            cx="50" cy="50" r="40" fill="transparent"
                            stroke="#d4a72c" strokeWidth="16"
                            strokeDasharray={`${strokeLow} ${circ}`}
                            strokeDashoffset={offsetLow}
                        />
                    )}
                    {out > 0 && (
                        <circle
                            cx="50" cy="50" r="40" fill="transparent"
                            stroke="#cf222e" strokeWidth="16"
                            strokeDasharray={`${strokeOut} ${circ}`}
                            strokeDashoffset={offsetOut}
                        />
                    )}
                </svg>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#2da44e", display: "inline-block" }}></span>
                        <span>In Stock: <strong>{healthy}</strong> ({healthyPct}%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#d4a72c", display: "inline-block" }}></span>
                        <span>Low Stock: <strong>{low}</strong> ({lowPct}%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#cf222e", display: "inline-block" }}></span>
                        <span>Out of Stock: <strong>{out}</strong> ({outPct}%)</span>
                    </div>
                </div>
            </div>
        )
    }

    // Category Stock Value Bar Chart
    function renderCategoryBars() {
        if (!stats || !stats.categoryDistribution || stats.categoryDistribution.length === 0) {
            return (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#6e7681", fontSize: 13 }}>
                    No category data available.
                </div>
            )
        }

        const maxVal = Math.max(...stats.categoryDistribution.map((c) => c.stockValue), 1)

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {stats.categoryDistribution.slice(0, 4).map((cat) => {
                    const pct = Math.round((cat.stockValue / maxVal) * 100)
                    return (
                        <div key={cat.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span style={{ fontWeight: 500, color: "#161b22" }}>{cat.name} ({cat.productCount} items)</span>
                                <span className={styles.mono} style={{ color: "#57606a" }}>₹{cat.stockValue.toLocaleString("en-IN")}</span>
                            </div>
                            <div style={{ width: "100%", height: 8, background: "#f0f2f5", borderRadius: 4, overflow: "hidden" }}>
                                <div
                                    style={{
                                        width: `${pct}%`,
                                        height: "100%",
                                        background: "linear-gradient(90deg, #161b22, #f2c14e)",
                                        borderRadius: 4,
                                        transition: "width 0.4s ease"
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const health = stats?.inventoryHealth || { status: "Good", score: 100, message: "" }
    let bannerClass = styles.healthBannerGood
    let statusColor = "#1a7f37"
    if (health.status === "Needs Attention") {
        bannerClass = styles.healthBannerWarning
        statusColor = "#9a6700"
    } else if (health.status === "Critical") {
        bannerClass = styles.healthBannerCritical
        statusColor = "#cf222e"
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Welcome back{user ? `, ${user.name}` : ""}</h1>
                        <p className={styles.pageSubtitle}>Real-time stock monitoring & inventory operations</p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <Link to="/products" className={styles.secondaryBtn} style={{ textDecoration: "none" }}>
                            Manage Products
                        </Link>
                        <Link to="/stock" className={styles.primaryBtn} style={{ textDecoration: "none" }}>
                            + Record Movement
                        </Link>
                    </div>
                </div>

                {loading && <p className={styles.emptyState}>Loading inventory dashboard...</p>}

                {!loading && stats && (
                    <>
                        {/* FEATURE 2: INVENTORY HEALTH INDICATOR */}
                        <div className={`${styles.healthBanner} ${bannerClass}`}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                                <p className={styles.healthTitle}>
                                    Inventory Health:
                                    <span style={{ color: statusColor, fontWeight: 700 }}>{health.status}</span>
                                    <span style={{ fontSize: 12, fontWeight: "normal", color: "#6e7681" }}>({health.score}% in stock)</span>
                                </p>
                                <p className={styles.healthDesc}>{health.message}</p>
                            </div>

                            <div className={styles.healthBarWrapper}>
                                <div className={styles.healthBarTrack}>
                                    <div
                                        className={`${styles.healthBarSegment} ${styles.healthBarGood}`}
                                        style={{ width: `${stats.totalProducts ? ((stats.healthyStockProducts || 0) / stats.totalProducts) * 100 : 100}%` }}
                                        title={`In stock: ${stats.healthyStockProducts}`}
                                    />
                                    <div
                                        className={`${styles.healthBarSegment} ${styles.healthBarLow}`}
                                        style={{ width: `${stats.totalProducts ? ((stats.lowStockProducts || 0) / stats.totalProducts) * 100 : 0}%` }}
                                        title={`Low stock: ${stats.lowStockProducts}`}
                                    />
                                    <div
                                        className={`${styles.healthBarSegment} ${styles.healthBarOut}`}
                                        style={{ width: `${stats.totalProducts ? ((stats.outOfStockProducts || 0) / stats.totalProducts) * 100 : 0}%` }}
                                        title={`Out of stock: ${stats.outOfStockProducts}`}
                                    />
                                </div>
                                <div className={styles.healthBarLegend}>
                                    <span>{stats.healthyStockProducts || 0} Healthy</span>
                                    <span>{stats.lowStockProducts || 0} Low</span>
                                    <span>{stats.outOfStockProducts || 0} Out</span>
                                </div>
                            </div>
                        </div>

                        {/* STAT CARDS GRID */}
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
                                <p className={styles.statLabel}>Inventory Value</p>
                                <p className={styles.statValue}>₹{stats.totalStockValue.toLocaleString("en-IN")}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Suppliers</p>
                                <p className={styles.statValue}>{stats.totalSuppliers}</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Low Stock Items</p>
                                <p className={`${styles.statValue} ${stats.lowStockProducts > 0 ? styles.statValueAlert : ""}`}>
                                    {stats.lowStockProducts}
                                </p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Out of Stock</p>
                                <p className={`${styles.statValue} ${stats.outOfStockProducts > 0 ? styles.statValueAlert : ""}`} style={{ color: stats.outOfStockProducts > 0 ? "#cf222e" : undefined }}>
                                    {stats.outOfStockProducts || 0}
                                </p>
                            </div>
                        </div>

                        {/* VISUAL ANALYTICS CHARTS */}
                        <div className={styles.chartsGrid}>
                            <div className={styles.chartCard}>
                                <div className={styles.chartHeader}>
                                    <h4 className={styles.chartTitle}>Stock Status Breakdown</h4>
                                    <span className={styles.chartSubtitle}>Distribution</span>
                                </div>
                                {renderStockDonut()}
                            </div>

                            <div className={styles.chartCard}>
                                <div className={styles.chartHeader}>
                                    <h4 className={styles.chartTitle}>Stock Value by Category</h4>
                                    <span className={styles.chartSubtitle}>Top Categories</span>
                                </div>
                                {renderCategoryBars()}
                            </div>
                        </div>

                        {/* RECENT STOCK MOVEMENTS TABLE */}
                        <div className={styles.card}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <h3 style={{ margin: 0, fontSize: 16 }}>Recent Stock Movements</h3>
                                <Link to="/stock" className={styles.linkBtn}>View Full Ledger &rarr;</Link>
                            </div>

                            {stats.recentTransactions.length === 0 && (
                                <p className={styles.emptyState}>No stock movements recorded yet.</p>
                            )}

                            {stats.recentTransactions.length > 0 && (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>SKU</th>
                                            <th>Type</th>
                                            <th>Quantity</th>
                                            <th>Logged By</th>
                                            <th>Date & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentTransactions.map((t) => (
                                            <tr key={t._id}>
                                                <td><strong>{t.product ? t.product.name : "Deleted Product"}</strong></td>
                                                <td className={styles.mono}>{t.product ? t.product.sku : "—"}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${t.type === "IN" ? styles.badgeIn : styles.badgeOut}`}>
                                                        {t.type === "IN" ? "+ Stock In" : "- Stock Out"}
                                                    </span>
                                                </td>
                                                <td className={styles.mono}>
                                                    <strong>{t.quantity}</strong> {t.product?.unit || ""}
                                                </td>
                                                <td>{t.performedBy ? t.performedBy.name : "System"}</td>
                                                <td>{new Date(t.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
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

export default Dashboard
