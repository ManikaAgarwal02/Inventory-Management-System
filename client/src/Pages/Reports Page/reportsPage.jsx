import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { downloadCsv } from "../../utils/csv"
import { GroupedBarChart, LineChart, HBarList } from "../../Components/Charts/charts"

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`
const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - n); return d }
const PRESETS = [
    { key: "today", label: "Today", days: 0 },
    { key: "7d", label: "Last 7 days", days: 6 },
    { key: "30d", label: "Last 30 days", days: 29 },
    { key: "3m", label: "Last 3 months", days: 89 },
    { key: "custom", label: "Custom" }
]

function ReportsPage() {
    const [preset, setPreset] = useState("30d")
    const [custom, setCustom] = useState({ from: iso(daysAgo(29)), to: iso(daysAgo(0)) })
    const [range, setRange] = useState({ from: iso(daysAgo(29)), to: iso(daysAgo(0)) })
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [rangeError, setRangeError] = useState("")

    useEffect(() => {
        let cancelled = false
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
        api.get("/reports/summary", { params: range }).then((res) => {
            if (cancelled) return
            setReport(res.data.data); setLoadError("")
        }).catch((err) => {
            if (!cancelled) setLoadError(getErrorMessage(err, "Unable to load report"))
        }).finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [range])

    function choosePreset(p) {
        setPreset(p.key)
        setRangeError("")
        if (p.key !== "custom") setRange({ from: iso(daysAgo(p.days)), to: iso(daysAgo(0)) })
    }

    function applyCustom() {
        if (!custom.from || !custom.to) return setRangeError("Choose both dates")
        if (custom.from > custom.to) return setRangeError("Start date must be on or before the end date")
        if ((new Date(custom.to) - new Date(custom.from)) / 86400000 > 365) return setRangeError("Range cannot exceed 366 days")
        setRangeError("")
        setRange({ ...custom })
    }

    function exportReport() {
        if (!report) return
        const { inventory, performance, movement } = report
        downloadCsv(`inventory-report-${report.range.from}_to_${report.range.to}.csv`,
            ["Section", "Item", "Value"],
            [
                ["Inventory", "Total products", inventory.totalProducts],
                ["Inventory", "Total units", inventory.totalUnits],
                ["Inventory", "Total value", inventory.totalValue],
                ["Movement", "Received", movement.received],
                ["Movement", "Issued", movement.issued],
                ["Movement", "Adjustments in", movement.adjustmentsIn],
                ["Movement", "Adjustments out", movement.adjustmentsOut],
                ...inventory.stockByCategory.map((c) => ["Category value", c.category, c.value]),
                ...performance.bestSelling.map((p) => ["Best selling (units out)", `${p.name} (${p.sku})`, p.unitsIssued]),
                ...performance.slowMoving.map((p) => ["Slow moving (units out)", `${p.name} (${p.sku})`, p.unitsIssued]),
                ...performance.highestValue.map((p) => ["Highest value", `${p.name} (${p.sku})`, p.value])
            ])
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Reports &amp; Analytics</h1>
                        <p className={styles.pageSubtitle}>{report ? `Movement from ${report.range.from} to ${report.range.to}` : "Inventory insights"}</p>
                    </div>
                    <button className={styles.secondaryBtn} onClick={exportReport} disabled={!report}>Export CSV</button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.rangeBtns}>
                        {PRESETS.map((p) => (
                            <button key={p.key} className={`${styles.secondaryBtn} ${preset === p.key ? styles.rangeBtnActive : ""}`} onClick={() => choosePreset(p)}>{p.label}</button>
                        ))}
                    </div>
                    {preset === "custom" && (
                        <>
                            <div className={styles.formRow}><label>From</label><input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div>
                            <div className={styles.formRow}><label>To</label><input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div>
                            <button className={styles.primaryBtn} onClick={applyCustom}>Apply</button>
                        </>
                    )}
                </div>
                {rangeError && <p className={styles.errorText}>{rangeError}</p>}
                {loadError && <div className={styles.errorBox}><span>{loadError}</span><button className={styles.secondaryBtn} onClick={() => setRange({ ...range })}>Retry</button></div>}
                {loading && !report && <p className={styles.emptyState}>Loading report...</p>}

                {report && (
                    <div style={{ opacity: loading ? 0.6 : 1 }}>
                        <div className={styles.statGrid}>
                            <div className={styles.statCard}><p className={styles.statLabel}>Inventory Value</p><p className={styles.statValue}>{rupees(report.inventory.totalValue)}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Total Products</p><p className={styles.statValue}>{report.inventory.totalProducts}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Total Stock Units</p><p className={styles.statValue}>{report.inventory.totalUnits}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Low Stock</p><p className={`${styles.statValue} ${report.inventory.lowStockCount ? styles.statValueAlert : ""}`}>{report.inventory.lowStockCount}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Out of Stock</p><p className={`${styles.statValue} ${report.inventory.outOfStockCount ? styles.statValueAlert : ""}`}>{report.inventory.outOfStockCount}</p></div>
                        </div>

                        <div className={styles.statGrid}>
                            <div className={styles.statCard}><p className={styles.statLabel}>Stock Received</p><p className={styles.statValue}>+{report.movement.received}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Stock Issued / Sold</p><p className={styles.statValue}>-{report.movement.issued}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Adjustments</p><p className={styles.statValue}><span style={{ color: "#1a7f37" }}>+{report.movement.adjustmentsIn}</span> / <span style={{ color: "#b3261e" }}>-{report.movement.adjustmentsOut}</span></p></div>
                        </div>

                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Stock In vs Stock Out</h3>
                                {report.movement.transactions === 0
                                    ? <p className={styles.emptyState}>No stock movements in this period.</p>
                                    : <GroupedBarChart data={report.movement.daily.map((d) => ({ label: d.date, a: d.inUnits, b: d.outUnits }))} />}
                            </div>
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Inventory Trend (total units)</h3>
                                <LineChart data={report.movement.trend.map((d) => ({ label: d.date, value: d.units }))} />
                            </div>
                        </div>

                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Stock Value by Category</h3>
                                {report.inventory.stockByCategory.length === 0
                                    ? <p className={styles.emptyState}>No products yet.</p>
                                    : <HBarList rows={report.inventory.stockByCategory.map((c) => ({ label: c.category, value: c.value }))} format={rupees} />}
                            </div>
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Top Products (units issued)</h3>
                                {report.performance.bestSelling.length === 0
                                    ? <p className={styles.emptyState}>No stock-outs in this period.</p>
                                    : <HBarList rows={report.performance.bestSelling.map((p) => ({ label: p.name, value: p.unitsIssued }))} />}
                            </div>
                        </div>

                        <div className={styles.card} style={{ marginBottom: 20 }}>
                            <h3 className={styles.cardTitle}>Stock by Category</h3>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr><th>Category</th><th>Products</th><th>Units</th><th>Value</th></tr></thead>
                                    <tbody>
                                        {report.inventory.stockByCategory.map((c) => (
                                            <tr key={c.category}><td>{c.category}</td><td className={styles.mono}>{c.products}</td><td className={styles.mono}>{c.units}</td><td className={styles.mono}>{rupees(c.value)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.twoCol}>
                            <ProductList title="Fast-Moving Products" rows={report.performance.bestSelling} empty="No stock-outs in this period." right={(p) => `${p.unitsIssued} out`} />
                            <ProductList title="Slow-Moving Products" rows={report.performance.slowMoving} empty="No products in stock." right={(p) => `${p.unitsIssued} out · ${p.quantity} on hand`} />
                        </div>
                        <div className={styles.twoCol}>
                            <ProductList title="Highest-Value Products" rows={report.performance.highestValue} empty="No products yet." right={(p) => rupees(p.value)} />
                            <ProductList title="Low & Out-of-Stock" rows={[...report.inventory.outOfStock, ...report.inventory.lowStock].slice(0, 10)} empty="Everything is above its reorder level." right={(p) => `${p.quantity} / min ${p.reorderLevel}`} danger />
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

function ProductList({ title, rows, empty, right, danger }) {
    return (
        <div className={styles.card}>
            <h3 className={styles.cardTitle}>{title}</h3>
            {rows.length === 0 && <p className={styles.emptyState}>{empty}</p>}
            {rows.map((p) => (
                <div key={p._id} className={styles.listRow}>
                    <div><div>{p.name}</div><div className={styles.listSub}>{p.sku}</div></div>
                    <span className={`${styles.mono} ${danger ? styles.dangerText : ""}`}>{right(p)}</span>
                </div>
            ))}
        </div>
    )
}

export default ReportsPage
