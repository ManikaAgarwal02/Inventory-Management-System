import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import ProductForm from "../../Components/Product Component/productForm"
import ConfirmModal from "../../Components/ConfirmModal/confirmModal"
import Toast from "../../Components/Toast/Toast"

function ProductsPage() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters and controls
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [stockFilter, setStockFilter] = useState("all")
    const [sortBy, setSortBy] = useState("newest")

    // Modals & UI states
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [newCategory, setNewCategory] = useState("")
    const [addingCategory, setAddingCategory] = useState(false)

    // Confirm Delete
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, productName: "" })

    // Toast feedback
    const [toast, setToast] = useState({ message: "", type: "info" })

    async function fetchAll() {
        try {
            setLoading(true)
            const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
                api.get("/products"),
                api.get("/categories"),
                api.get("/suppliers")
            ])
            setProducts(productsRes.data.data || [])
            setCategories(categoriesRes.data.data || [])
            setSuppliers(suppliersRes.data.data || [])
        } catch (error) {
            console.log("Error loading products:", error)
            setToast({
                message: error.response?.data?.message || "Failed to load product data",
                type: "error"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    function confirmDelete(product) {
        setDeleteModal({
            isOpen: true,
            productId: product._id,
            productName: product.name
        })
    }

    async function handleDeleteConfirmed() {
        const id = deleteModal.productId
        const name = deleteModal.productName
        setDeleteModal({ isOpen: false, productId: null, productName: "" })

        try {
            await api.delete(`/products/${id}`)
            setToast({ message: `Product "${name}" deleted successfully`, type: "success" })
            fetchAll()
        } catch (error) {
            setToast({
                message: error.response?.data?.message || "Failed to delete product",
                type: "error"
            })
        }
    }

    function handleEdit(product) {
        setEditingProduct(product)
        setShowForm(true)
    }

    function handleAddNew() {
        setEditingProduct(null)
        setShowForm(true)
    }

    function handleSaved(savedMsg) {
        setShowForm(false)
        setEditingProduct(null)
        setToast({ message: savedMsg || "Product saved successfully!", type: "success" })
        fetchAll()
    }

    // FEATURE 3: QUICK STOCK UPDATE (+10, +5, -1, -5)
    async function handleQuickStock(productId, delta, productName, unit) {
        try {
            const response = await api.patch(`/products/${productId}/quick-stock`, { delta })
            const updated = response.data.data

            // Update local state smoothly
            setProducts((prev) => prev.map((p) => (p._id === productId ? updated : p)))

            setToast({
                message: `${productName}: Stock ${delta > 0 ? `increased by +${delta}` : `reduced by ${delta}`} ${unit}`,
                type: "success"
            })
        } catch (error) {
            setToast({
                message: error.response?.data?.message || "Failed to adjust stock",
                type: "error"
            })
        }
    }

    async function handleAddCategory(e) {
        e.preventDefault()
        if (!newCategory.trim()) return
        try {
            setAddingCategory(true)
            const res = await api.post("/categories", { name: newCategory.trim() })
            setCategories((prev) => [...prev, res.data.data])
            setToast({ message: `Category "${res.data.data.name}" added successfully`, type: "success" })
            setNewCategory("")
        } catch (error) {
            setToast({
                message: error.response?.data?.message || "Failed to add category",
                type: "error"
            })
        } finally {
            setAddingCategory(false)
        }
    }

    // Filter and Sort Pipeline
    const filteredProducts = products.filter((p) => {
        const term = search.toLowerCase()
        const matchesSearch = p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)

        const matchesCategory =
            selectedCategory === "all" || (p.category && p.category._id === selectedCategory)

        let matchesStock = true
        if (stockFilter === "inStock") {
            matchesStock = p.quantity > p.reorderLevel
        } else if (stockFilter === "lowStock") {
            matchesStock = p.quantity > 0 && p.quantity <= p.reorderLevel
        } else if (stockFilter === "outOfStock") {
            matchesStock = p.quantity === 0
        }

        return matchesSearch && matchesCategory && matchesStock
    })

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortBy === "nameAsc") return a.name.localeCompare(b.name)
        if (sortBy === "qtyAsc") return a.quantity - b.quantity
        if (sortBy === "qtyDesc") return b.quantity - a.quantity
        if (sortBy === "priceAsc") return a.price - b.price
        if (sortBy === "priceDesc") return b.price - a.price
        return new Date(b.createdAt) - new Date(a.createdAt)
    })

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Product Inventory</h1>
                        <p className={styles.pageSubtitle}>
                            {products.length} products registered • {filteredProducts.length} matching filters
                        </p>
                    </div>
                    <button className={styles.primaryBtn} onClick={handleAddNew}>+ Add Product</button>
                </div>

                {/* SEARCH, FILTER & SORT TOOLBAR */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <input
                            className={styles.searchInput}
                            placeholder="🔍 Search product name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            className={styles.filterSelect}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>

                        <select
                            className={styles.filterSelect}
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                        >
                            <option value="all">All Stock Statuses</option>
                            <option value="inStock">In Stock (Healthy)</option>
                            <option value="lowStock">Low Stock (Needs Reorder)</option>
                            <option value="outOfStock">Out of Stock</option>
                        </select>

                        <select
                            className={styles.filterSelect}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">Sort: Newest First</option>
                            <option value="nameAsc">Sort: Name (A-Z)</option>
                            <option value="qtyAsc">Sort: Stock (Low to High)</option>
                            <option value="qtyDesc">Sort: Stock (High to Low)</option>
                            <option value="priceAsc">Sort: Price (Low to High)</option>
                            <option value="priceDesc">Sort: Price (High to Low)</option>
                        </select>
                    </div>

                    <form onSubmit={handleAddCategory} className={styles.toolbarRight}>
                        <input
                            placeholder="New category..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            style={{ padding: "8px 10px", fontSize: 13, border: "1px solid #d0d5db", borderRadius: 6 }}
                        />
                        <button type="submit" className={styles.secondaryBtn} disabled={addingCategory}>
                            + Category
                        </button>
                    </form>
                </div>

                {loading && <p className={styles.emptyState}>Loading products...</p>}

                {!loading && sortedProducts.length === 0 && (
                    <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ margin: "0 0 12px 0", color: "#6e7681", fontSize: 15 }}>
                            {products.length === 0
                                ? "No products found in inventory. Add your first product to get started!"
                                : "No products match the selected filters or search term."}
                        </p>
                        {products.length === 0 && (
                            <button className={styles.primaryBtn} onClick={handleAddNew}>
                                + Add First Product
                            </button>
                        )}
                    </div>
                )}

                {!loading && sortedProducts.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th>Supplier</th>
                                <th>Price</th>
                                <th>Quantity & Quick Adjust</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProducts.map((p) => {
                                const isOutOfStock = p.quantity === 0
                                const isLowStock = p.quantity > 0 && p.quantity <= p.reorderLevel

                                return (
                                    <tr key={p._id}>
                                        <td>
                                            <strong>{p.name}</strong>
                                            <div style={{ fontSize: 11, color: "#6e7681" }}>Reorder at: {p.reorderLevel} {p.unit}</div>
                                        </td>
                                        <td className={styles.mono}>{p.sku}</td>
                                        <td>{p.category ? p.category.name : "—"}</td>
                                        <td>{p.supplier ? p.supplier.name : "—"}</td>
                                        <td className={styles.mono}>₹{p.price.toLocaleString("en-IN")}</td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span className={styles.mono} style={{ minWidth: 50, fontWeight: 600 }}>
                                                    {p.quantity} {p.unit}
                                                </span>
                                                {/* QUICK STOCK ADJUSTMENT BUTTONS */}
                                                <div className={styles.quickStockGroup}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.quickBtn} ${styles.quickBtnPlus}`}
                                                        title="Add 10 units"
                                                        onClick={() => handleQuickStock(p._id, 10, p.name, p.unit)}
                                                    >
                                                        +10
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.quickBtn} ${styles.quickBtnPlus}`}
                                                        title="Add 5 units"
                                                        onClick={() => handleQuickStock(p._id, 5, p.name, p.unit)}
                                                    >
                                                        +5
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={p.quantity < 1}
                                                        className={`${styles.quickBtn} ${styles.quickBtnMinus}`}
                                                        title="Reduce 1 unit"
                                                        onClick={() => handleQuickStock(p._id, -1, p.name, p.unit)}
                                                    >
                                                        -1
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={p.quantity < 5}
                                                        className={`${styles.quickBtn} ${styles.quickBtnMinus}`}
                                                        title="Reduce 5 units"
                                                        onClick={() => handleQuickStock(p._id, -5, p.name, p.unit)}
                                                    >
                                                        -5
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {isOutOfStock ? (
                                                <span className={`${styles.badge} ${styles.badgeOutOfStock}`}>
                                                    ● Out of Stock
                                                </span>
                                            ) : isLowStock ? (
                                                <span className={`${styles.badge} ${styles.badgeLow}`}>
                                                    ▲ Low Stock
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${styles.badgeOk}`}>
                                                    ✓ In Stock
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <button className={styles.linkBtn} onClick={() => handleEdit(p)}>
                                                Edit
                                            </button>
                                            <button className={styles.deleteBtn} onClick={() => confirmDelete(p)}>
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}

                {showForm && (
                    <ProductForm
                        product={editingProduct}
                        categories={categories}
                        suppliers={suppliers}
                        onClose={() => setShowForm(false)}
                        onSaved={handleSaved}
                    />
                )}

                <ConfirmModal
                    isOpen={deleteModal.isOpen}
                    title="Delete Product"
                    message={`Are you sure you want to permanently delete "${deleteModal.productName}"? This action cannot be undone.`}
                    confirmText="Delete Product"
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setDeleteModal({ isOpen: false, productId: null, productName: "" })}
                    isDanger={true}
                />

                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ message: "", type: "info" })}
                />
            </div>
        </Layout>
    )
}

export default ProductsPage
