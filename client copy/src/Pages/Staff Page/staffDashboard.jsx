import { useEffect, useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import styles from "./staffDashboard.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { getUser, logout, isAdmin } from "../../utils/auth"
import { useToast } from "../../Components/Toast/toastContext"

function StaffDashboard() {
    const navigate = useNavigate()
    const showToast = useToast()
    const currentUser = getUser()
    const [activeTab, setActiveTab] = useState("overview") // "overview" | "products" | "requests" | "profile"

    // Data state
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [myRequests, setMyRequests] = useState([])
    const [recentActivity, setRecentActivity] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Filter & search state for products
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")

    // Stock Request Modal state
    const [showRequestModal, setShowRequestModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState("")
    const [requestQuantity, setRequestQuantity] = useState(1)
    const [requestReason, setRequestReason] = useState("")
    const [submittingRequest, setSubmittingRequest] = useState(false)

    function handleLogout() {
        logout()
        navigate("/login")
    }

    async function loadData() {
        try {
            setLoading(true)
            const [productsRes, categoriesRes, requestsRes, dashboardRes] = await Promise.all([
                api.get("/products"),
                api.get("/categories"),
                api.get("/stock-requests/my"),
                api.get("/dashboard/stats")
            ])

            setProducts(productsRes.data?.data || [])
            setCategories(categoriesRes.data?.data || [])
            setMyRequests(requestsRes.data?.data || [])
            setRecentActivity(dashboardRes.data?.data?.recentTransactions || [])
            setError("")
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load dashboard data"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Open stock request modal with optional pre-selected product
    function openStockRequestModal(productId = "") {
        setSelectedProduct(productId || (products[0]?._id || ""))
        setRequestQuantity(1)
        setRequestReason("")
        setShowRequestModal(true)
    }

    async function handleStockRequestSubmit(e) {
        e.preventDefault()
        if (!selectedProduct) {
            showToast("Please select a product", "error")
            return
        }
        if (Number(requestQuantity) <= 0) {
            showToast("Quantity must be at least 1", "error")
            return
        }

        try {
            setSubmittingRequest(true)
            await api.post("/stock-requests", {
                product: selectedProduct,
                quantity: Number(requestQuantity),
                reason: requestReason.trim()
            })

            showToast("Stock request submitted to Admin successfully")
            setShowRequestModal(false)

            // Refresh my requests
            const reqRes = await api.get("/stock-requests/my")
            setMyRequests(reqRes.data?.data || [])
            setActiveTab("requests")
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to submit request"), "error")
        } finally {
            setSubmittingRequest(false)
        }
    }

    // Filtered products list
    const visibleProducts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        return products.filter((p) => {
            const matchesSearch = !term ||
                p.name.toLowerCase().includes(term) ||
                p.sku.toLowerCase().includes(term)
            const matchesCategory = !categoryFilter || p.category?._id === categoryFilter
            return matchesSearch && matchesCategory
        })
    }, [products, searchTerm, categoryFilter])

    const pendingRequestsCount = myRequests.filter((r) => r.status === "Pending").length

    return (
        <div className={styles.staffContainer}>
            {/* ---------------- Navbar ---------------- */}
            <header className={styles.navbar}>
                <div className={styles.brandGroup}>
                    <Link to="/" className={styles.brandTitle}>Stockroom</Link>
                    <span className={styles.staffBadge}>Staff Portal</span>
                </div>

                <nav>
                    <ul className={styles.navTabs}>
                        <li>
                            <button
                                className={`${styles.navTabBtn} ${activeTab === "overview" ? styles.navTabActive : ""}`}
                                onClick={() => setActiveTab("overview")}
                            >
                                📊 Overview
                            </button>
                        </li>
                        <li>
                            <button
                                className={`${styles.navTabBtn} ${activeTab === "products" ? styles.navTabActive : ""}`}
                                onClick={() => setActiveTab("products")}
                            >
                                📦 View Products
                            </button>
                        </li>
                        <li>
                            <button
                                className={`${styles.navTabBtn} ${activeTab === "requests" ? styles.navTabActive : ""}`}
                                onClick={() => setActiveTab("requests")}
                            >
                                📋 My Requests {pendingRequestsCount > 0 && `(${pendingRequestsCount})`}
                            </button>
                        </li>
                        <li>
                            <button
                                className={`${styles.navTabBtn} ${activeTab === "profile" ? styles.navTabActive : ""}`}
                                onClick={() => setActiveTab("profile")}
                            >
                                👤 Profile
                            </button>
                        </li>
                    </ul>
                </nav>

                <div className={styles.userControls}>
                    {isAdmin() && (
                        <Link to="/dashboard" className={styles.adminSwitchBtn} title="Switch to Admin Dashboard">
                            Admin Dashboard &rarr;
                        </Link>
                    )}
                    <div className={styles.userGreeting}>
                        <span className={styles.userName}>{currentUser?.name || "Staff Member"}</span>
                        <span className={styles.userRole}>{currentUser?.role || "staff"}</span>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
                </div>
            </header>

            {/* ---------------- Main View ---------------- */}
            <main className={styles.mainContent}>
                {error && (
                    <div className={styles.errorBox}>
                        <span>{error}</span>
                        <button className={styles.tableActionBtn} onClick={loadData}>Retry</button>
                    </div>
                )}

                {loading ? (
                    <p className={styles.emptyState}>Loading staff portal...</p>
                ) : (
                    <>
                        {/* ================= TAB 1: OVERVIEW ================= */}
                        {activeTab === "overview" && (
                            <div>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1 className={styles.pageTitle}>Welcome, {currentUser?.name || "Employee"}!</h1>
                                        <p className={styles.pageSubtitle}>Here is an overview of warehouse inventory and your requests</p>
                                    </div>
                                    <button
                                        className={styles.primaryActionBtn}
                                        onClick={() => openStockRequestModal()}
                                    >
                                        + Request Additional Stock
                                    </button>
                                </div>

                                <div className={styles.statGrid}>
                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>Total Products Cataloged</p>
                                        <p className={styles.statValue}>{products.length}</p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>Available Stock Units</p>
                                        <p className={styles.statValue}>
                                            {products.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                                        </p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>My Pending Requests</p>
                                        <p className={`${styles.statValue} ${pendingRequestsCount > 0 ? styles.statValuePending : ""}`}>
                                            {pendingRequestsCount}
                                        </p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <p className={styles.statLabel}>My Total Requests</p>
                                        <p className={styles.statValue}>{myRequests.length}</p>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>Recent Inventory Movements</h3>
                                        <button
                                            className={styles.tableActionBtn}
                                            onClick={() => setActiveTab("products")}
                                        >
                                            View All Products &rarr;
                                        </button>
                                    </div>

                                    {recentActivity.length === 0 ? (
                                        <p className={styles.emptyState}>No recent inventory movements recorded.</p>
                                    ) : (
                                        <div className={styles.tableWrap}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Product</th>
                                                        <th>SKU</th>
                                                        <th>Movement Type</th>
                                                        <th>Quantity</th>
                                                        <th>Recorded By</th>
                                                        <th>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentActivity.map((t) => (
                                                        <tr key={t._id}>
                                                            <td>{t.product ? t.product.name : "Deleted Product"}</td>
                                                            <td className={styles.mono}>{t.product?.sku || "—"}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${t.type === "IN" ? styles.badgeIn : styles.badgeOut}`}>
                                                                    {t.type}
                                                                </span>
                                                            </td>
                                                            <td className={styles.mono}>{t.quantity}</td>
                                                            <td>{t.performedBy ? t.performedBy.name : "System"}</td>
                                                            <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* My Recent Requests preview */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>My Recent Stock Requests</h3>
                                        <button
                                            className={styles.tableActionBtn}
                                            onClick={() => setActiveTab("requests")}
                                        >
                                            View All Requests &rarr;
                                        </button>
                                    </div>

                                    {myRequests.length === 0 ? (
                                        <p className={styles.emptyState}>You have not submitted any stock requests yet.</p>
                                    ) : (
                                        <div className={styles.tableWrap}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Product</th>
                                                        <th>Requested Qty</th>
                                                        <th>Reason</th>
                                                        <th>Status</th>
                                                        <th>Submitted</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {myRequests.slice(0, 3).map((r) => (
                                                        <tr key={r._id}>
                                                            <td><strong>{r.product?.name || "Unknown Product"}</strong></td>
                                                            <td className={styles.mono}>{r.quantity} {r.product?.unit || "units"}</td>
                                                            <td>{r.reason || "—"}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${
                                                                    r.status === "Approved" ? styles.badgeApproved :
                                                                    r.status === "Rejected" ? styles.badgeRejected :
                                                                    styles.badgePending
                                                                }`}>
                                                                    {r.status}
                                                                </span>
                                                            </td>
                                                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ================= TAB 2: VIEW PRODUCTS ================= */}
                        {activeTab === "products" && (
                            <div>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1 className={styles.pageTitle}>Product Inventory</h1>
                                        <p className={styles.pageSubtitle}>Browse available stock and request replenishments</p>
                                    </div>
                                    <button
                                        className={styles.primaryActionBtn}
                                        onClick={() => openStockRequestModal()}
                                    >
                                        + Request Stock
                                    </button>
                                </div>

                                <div className={styles.toolbar}>
                                    <input
                                        type="text"
                                        placeholder="Search by product name or SKU..."
                                        className={styles.searchInput}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <select
                                        className={styles.filterSelect}
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map((c) => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {(searchTerm || categoryFilter) && (
                                        <button
                                            className={styles.tableActionBtn}
                                            onClick={() => { setSearchTerm(""); setCategoryFilter("") }}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>

                                <div className={styles.card}>
                                    {visibleProducts.length === 0 ? (
                                        <p className={styles.emptyState}>No products match your search criteria.</p>
                                    ) : (
                                        <div className={styles.tableWrap}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Product Name</th>
                                                        <th>SKU</th>
                                                        <th>Category</th>
                                                        <th>Available Stock</th>
                                                        <th>Status</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleProducts.map((p) => {
                                                        const isZero = p.quantity === 0
                                                        const isLow = p.quantity <= (p.reorderLevel || 0)
                                                        const badgeStyle = isZero ? styles.badgeZero : isLow ? styles.badgeLow : styles.badgeOk
                                                        const badgeLabel = isZero ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"

                                                        return (
                                                            <tr key={p._id}>
                                                                <td><strong>{p.name}</strong></td>
                                                                <td className={styles.mono}>{p.sku}</td>
                                                                <td>{p.category ? p.category.name : "—"}</td>
                                                                <td className={styles.mono}>
                                                                    <strong>{p.quantity}</strong> {p.unit || "pcs"}
                                                                </td>
                                                                <td>
                                                                    <span className={`${styles.badge} ${badgeStyle}`}>
                                                                        {badgeLabel}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        className={styles.tableActionBtn}
                                                                        onClick={() => openStockRequestModal(p._id)}
                                                                        title="Request stock for this product"
                                                                    >
                                                                        + Request Stock
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ================= TAB 3: MY REQUESTS ================= */}
                        {activeTab === "requests" && (
                            <div>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1 className={styles.pageTitle}>My Stock Requests</h1>
                                        <p className={styles.pageSubtitle}>Track the status of your submitted stock requisitions</p>
                                    </div>
                                    <button
                                        className={styles.primaryActionBtn}
                                        onClick={() => openStockRequestModal()}
                                    >
                                        + New Stock Request
                                    </button>
                                </div>

                                <div className={styles.card}>
                                    {myRequests.length === 0 ? (
                                        <p className={styles.emptyState}>
                                            You haven't made any stock requests yet. Use the "+ New Stock Request" button above to submit one.
                                        </p>
                                    ) : (
                                        <div className={styles.tableWrap}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Product</th>
                                                        <th>Requested Qty</th>
                                                        <th>Reason / Purpose</th>
                                                        <th>Status</th>
                                                        <th>Admin Remarks</th>
                                                        <th>Reviewed By</th>
                                                        <th>Date Requested</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {myRequests.map((r) => (
                                                        <tr key={r._id}>
                                                            <td>
                                                                <strong>{r.product?.name || "Product"}</strong>
                                                                <div className={styles.mono} style={{ fontSize: "11px", color: "#6e7681" }}>
                                                                    {r.product?.sku || ""}
                                                                </div>
                                                            </td>
                                                            <td className={styles.mono}>
                                                                <strong>{r.quantity}</strong> {r.product?.unit || "units"}
                                                            </td>
                                                            <td>{r.reason || "—"}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${
                                                                    r.status === "Approved" ? styles.badgeApproved :
                                                                    r.status === "Rejected" ? styles.badgeRejected :
                                                                    styles.badgePending
                                                                }`}>
                                                                    {r.status}
                                                                </span>
                                                            </td>
                                                            <td>{r.adminNotes || "—"}</td>
                                                            <td>{r.reviewedBy ? r.reviewedBy.name : "—"}</td>
                                                            <td>{new Date(r.createdAt).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ================= TAB 4: PROFILE ================= */}
                        {activeTab === "profile" && (
                            <div>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1 className={styles.pageTitle}>My Profile</h1>
                                        <p className={styles.pageSubtitle}>Your employee account details and preferences</p>
                                    </div>
                                </div>

                                <div className={styles.profileCard}>
                                    <div className={styles.avatar}>
                                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "S"}
                                    </div>
                                    <h2 className={styles.profileName}>{currentUser?.name || "Staff Employee"}</h2>
                                    <p className={styles.profileEmail}>{currentUser?.email || "staff@stockroom.local"}</p>

                                    <div className={styles.profileDetails}>
                                        <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Account Role</span>
                                            <span className={`${styles.badge} ${styles.badgePending}`}>
                                                {currentUser?.role || "staff"}
                                            </span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Account Status</span>
                                            <span className={`${styles.badge} ${styles.badgeOk}`}>Active</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Stock Requests Submitted</span>
                                            <span className={styles.detailVal}>{myRequests.length}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Pending Approvals</span>
                                            <span className={styles.detailVal}>{pendingRequestsCount}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                        <button className={styles.logoutBtn} onClick={handleLogout} style={{ padding: "10px 24px" }}>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ---------------- Stock Request Modal ---------------- */}
            {showRequestModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalBox}>
                        <h3 className={styles.modalTitle}>Submit Stock Request</h3>
                        <p className={styles.modalSubtitle}>Request additional inventory items from management</p>

                        <form onSubmit={handleStockRequestSubmit}>
                            <div className={styles.formRow}>
                                <label>Select Product</label>
                                <select
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>-- Select a Product --</option>
                                    {products.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name} ({p.sku}) — Available: {p.quantity} {p.unit || "pcs"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formRow}>
                                <label>Requested Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={requestQuantity}
                                    onChange={(e) => setRequestQuantity(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.formRow}>
                                <label>Reason / Department Usage</label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Floor assembly restock, workshop project requisition..."
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => setShowRequestModal(false)}
                                    disabled={submittingRequest}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={submittingRequest}
                                >
                                    {submittingRequest ? "Submitting..." : "Send Request to Admin"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StaffDashboard
