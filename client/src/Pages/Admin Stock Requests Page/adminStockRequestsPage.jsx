import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { useToast } from "../../Components/Toast/toastContext"

function AdminStockRequestsPage() {
    const showToast = useToast()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [statusFilter, setStatusFilter] = useState("")

    // Review Modal state
    const [reviewingRequest, setReviewingRequest] = useState(null)
    const [reviewAction, setReviewAction] = useState("Approved") // "Approved" | "Rejected"
    const [adminNotes, setAdminNotes] = useState("")
    const [submittingReview, setSubmittingReview] = useState(false)

    async function fetchRequests() {
        try {
            setLoading(true)
            const url = statusFilter ? `/stock-requests?status=${statusFilter}` : "/stock-requests"
            const response = await api.get(url)
            setRequests(response.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load stock requests"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [statusFilter])

    function openReviewModal(req, action) {
        setReviewingRequest(req)
        setReviewAction(action)
        setAdminNotes(action === "Approved" ? "Stock approved for issuance" : "Requisition cannot be fulfilled at this time")
    }

    async function handleReviewSubmit(e) {
        e.preventDefault()
        if (!reviewingRequest) return

        try {
            setSubmittingReview(true)
            await api.patch(`/stock-requests/${reviewingRequest._id}/status`, {
                status: reviewAction,
                adminNotes: adminNotes.trim()
            })

            showToast(`Request marked as ${reviewAction}`)
            setReviewingRequest(null)
            fetchRequests()
        } catch (error) {
            showToast(getErrorMessage(error, "Unable to update request"), "error")
        } finally {
            setSubmittingReview(false)
        }
    }

    const pendingCount = requests.filter((r) => r.status === "Pending").length

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Employee Stock Requests</h1>
                        <p className={styles.pageSubtitle}>
                            Review and manage stock requisitions submitted by warehouse staff
                        </p>
                    </div>
                </div>

                <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                        <p className={styles.statLabel}>Pending Reviews</p>
                        <p className={`${styles.statValue} ${pendingCount > 0 ? styles.statValueAlert : ""}`}>
                            {pendingCount}
                        </p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statLabel}>Total Requisitions</p>
                        <p className={styles.statValue}>{requests.length}</p>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.formRow}>
                        <label>Filter By Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending Only</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    {statusFilter && (
                        <button className={styles.secondaryBtn} onClick={() => setStatusFilter("")}>
                            Show All
                        </button>
                    )}
                </div>

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={fetchRequests}>Retry</button>
                    </div>
                )}

                {loading && <p className={styles.emptyState}>Loading staff requests...</p>}

                {!loading && !loadError && requests.length === 0 && (
                    <p className={styles.emptyState}>
                        {statusFilter ? `No ${statusFilter.toLowerCase()} requests found.` : "No stock requests submitted by employees yet."}
                    </p>
                )}

                {!loading && requests.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Staff Member</th>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Requested Qty</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Admin Notes</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r) => {
                                    const badgeClass =
                                        r.status === "Approved" ? styles.badgeOk :
                                        r.status === "Rejected" ? styles.badgeLow :
                                        styles.badgeWarn

                                    return (
                                        <tr key={r._id}>
                                            <td>
                                                <div><strong>{r.requestedBy?.name || "Employee"}</strong></div>
                                                <div style={{ fontSize: "11px", color: "#6e7681" }}>{r.requestedBy?.email || ""}</div>
                                            </td>
                                            <td><strong>{r.product?.name || "Deleted Product"}</strong></td>
                                            <td className={styles.mono}>{r.product?.sku || "—"}</td>
                                            <td className={styles.mono}>
                                                <strong>{r.quantity}</strong> {r.product?.unit || "pcs"}
                                            </td>
                                            <td>{r.reason || "—"}</td>
                                            <td>
                                                <span className={`${styles.badge} ${badgeClass}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td>{r.adminNotes || "—"}</td>
                                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                {r.status === "Pending" ? (
                                                    <div className={styles.actionsCell}>
                                                        <button
                                                            className={styles.linkBtn}
                                                            style={{ color: "#1a7f37", fontWeight: 600 }}
                                                            onClick={() => openReviewModal(r, "Approved")}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={() => openReviewModal(r, "Rejected")}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: "12px", color: "#6e7681" }}>
                                                        Resolved
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Review Modal */}
                {reviewingRequest && (
                    <div className={styles.modalOverlay}>
                        <form className={styles.modalBox} onSubmit={handleReviewSubmit}>
                            <h3 className={styles.modalTitle}>
                                {reviewAction === "Approved" ? "Approve Stock Request" : "Reject Stock Request"}
                            </h3>
                            <p className={styles.confirmText}>
                                {reviewAction === "Approved" ? "Approve" : "Reject"} request for{" "}
                                <strong>{reviewingRequest.quantity} {reviewingRequest.product?.unit || "units"}</strong> of{" "}
                                <strong>{reviewingRequest.product?.name}</strong> requested by{" "}
                                <strong>{reviewingRequest.requestedBy?.name}</strong>.
                            </p>

                            <div className={styles.formRow}>
                                <label>Admin Feedback / Remarks</label>
                                <textarea
                                    rows={3}
                                    placeholder="Add optional notes for the employee..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => setReviewingRequest(null)}
                                    disabled={submittingReview}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={reviewAction === "Approved" ? styles.primaryBtn : styles.dangerBtn}
                                    disabled={submittingReview}
                                >
                                    {submittingReview ? "Processing..." : `Confirm ${reviewAction}`}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default AdminStockRequestsPage
