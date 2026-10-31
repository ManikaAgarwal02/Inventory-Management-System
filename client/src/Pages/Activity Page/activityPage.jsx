import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"

const PAGE_SIZE = 25

function ActivityPage() {
    const [logs, setLogs] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [entity, setEntity] = useState("")
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    async function fetchLogs(targetPage = page, targetEntity = entity) {
        setLoading(true)
        try {
            const params = { page: targetPage, limit: PAGE_SIZE }
            if (targetEntity) params.entity = targetEntity
            const response = await api.get("/activity-logs", { params })
            setLogs(response.data.data || [])
            setTotal(response.data.total || 0)
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load activity log"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // reload whenever the page or filter changes
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLogs(page, entity)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, entity])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Activity Log</h1>
                        <p className={styles.pageSubtitle}>Who changed what, most recent first</p>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.formRow}>
                        <label>Area</label>
                        <select value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value) }}>
                            <option value="">All</option>
                            <option value="product">Products</option>
                            <option value="stock">Stock</option>
                            <option value="supplier">Suppliers</option>
                            <option value="category">Categories</option>
                            <option value="user">Staff</option>
                        </select>
                    </div>
                </div>

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={() => fetchLogs()}>Retry</button>
                    </div>
                )}

                {loading && <p className={styles.emptyState}>Loading activity...</p>}

                {!loading && !loadError && logs.length === 0 && (
                    <p className={styles.emptyState}>No activity recorded yet.</p>
                )}

                {!loading && logs.length > 0 && (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>When</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log._id}>
                                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                                            <td>{log.userName || "—"}</td>
                                            <td className={styles.mono}>{log.action}</td>
                                            <td>{log.summary || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.headerActions} style={{ marginTop: 16, alignItems: "center" }}>
                            <button className={styles.secondaryBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                            <span className={styles.resultCount} style={{ margin: 0 }}>Page {page} of {totalPages}</span>
                            <button className={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    )
}

export default ActivityPage
