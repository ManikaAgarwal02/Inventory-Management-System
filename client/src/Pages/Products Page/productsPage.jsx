import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { downloadCsv } from "../../utils/csv"
import ProductForm from "../../Components/Product Component/productForm"
import ConfirmDialog from "../../Components/Confirm Dialog/confirmDialog"
import { useToast } from "../../Components/Toast/toastContext"
import { isAdmin } from "../../utils/auth"

function ProductsPage() {
    const showToast = useToast()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [sortBy, setSortBy] = useState("newest")
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [productToDelete, setProductToDelete] = useState(null)
    const [newCategory, setNewCategory] = useState("")

    async function fetchAll() {
        try {
            const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
                api.get("/products"),
                api.get("/categories"),
                api.get("/suppliers")
            ])
            setProducts(productsRes.data.data || [])
            setCategories(categoriesRes.data.data || [])
            setSuppliers(suppliersRes.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load products"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAll()
    }, [])

    async function confirmDelete() {
        try {
            await api.delete(`/products/${productToDelete._id}`)
            showToast("Product deleted")
            fetchAll()
        } catch (error) {
            showToast(getErrorMessage(error, "Unable to delete product"), "error")
        } finally {
            setProductToDelete(null)
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

    function handleSaved() {
        showToast(editingProduct ? "Product updated" : "Product added")
        setShowForm(false)
        setEditingProduct(null)
        fetchAll()
    }

    async function handleAddCategory(e) {
        e.preventDefault()
        if (!newCategory.trim()) return
        try {
            await api.post("/categories", { name: newCategory.trim() })
            showToast("Category added")
            setNewCategory("")
            fetchAll()
        } catch (error) {
            showToast(getErrorMessage(error, "Unable to add category"), "error")
        }
    }

    function stockStatus(p) {
        if (p.quantity === 0) return "out"
        if (p.quantity <= p.reorderLevel) return "low"
        return "ok"
    }

    const visibleProducts = useMemo(() => {
        const term = search.trim().toLowerCase()

        const filtered = products.filter((p) => {
            const matchesSearch = !term ||
                p.name.toLowerCase().includes(term) ||
                p.sku.toLowerCase().includes(term) ||
                (p.supplier && p.supplier.name.toLowerCase().includes(term))
            const matchesCategory = !categoryFilter || p.category?._id === categoryFilter
            const matchesStatus = !statusFilter || stockStatus(p) === statusFilter
            return matchesSearch && matchesCategory && matchesStatus
        })

        const sorters = {
            newest: () => 0,
            name: (a, b) => a.name.localeCompare(b.name),
            quantityLow: (a, b) => a.quantity - b.quantity,
            quantityHigh: (a, b) => b.quantity - a.quantity,
            priceHigh: (a, b) => b.price - a.price
        }
        return [...filtered].sort(sorters[sortBy])
    }, [products, search, categoryFilter, statusFilter, sortBy])

    function handleExport() {
        downloadCsv(
            "products.csv",
            ["Name", "SKU", "Category", "Supplier", "Price", "Quantity", "Unit", "Reorder Level", "Status"],
            visibleProducts.map((p) => [
                p.name, p.sku, p.category?.name || "", p.supplier?.name || "",
                p.price, p.quantity, p.unit, p.reorderLevel,
                { out: "Out of Stock", low: "Low Stock", ok: "In Stock" }[stockStatus(p)]
            ])
        )
    }

    function clearFilters() {
        setSearch("")
        setCategoryFilter("")
        setStatusFilter("")
        setSortBy("newest")
    }

    const filtersActive = search || categoryFilter || statusFilter

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Products</h1>
                        <p className={styles.pageSubtitle}>{products.length} products tracked in inventory</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link to="/products/import"><button className={styles.secondaryBtn}>Import Products</button></Link>
                        <button className={styles.secondaryBtn} onClick={handleExport} disabled={visibleProducts.length === 0}>Export CSV</button>
                        <button className={styles.primaryBtn} onClick={handleAddNew}>+ Add Product</button>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={`${styles.formRow} ${styles.toolbarGrow}`}>
                        <label>Search</label>
                        <input placeholder="Name, SKU or supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className={styles.formRow}>
                        <label>Category</label>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">All</option>
                            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formRow}>
                        <label>Status</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All</option>
                            <option value="ok">In Stock</option>
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock</option>
                        </select>
                    </div>
                    <div className={styles.formRow}>
                        <label>Sort By</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="quantityLow">Quantity (low first)</option>
                            <option value="quantityHigh">Quantity (high first)</option>
                            <option value="priceHigh">Price (high first)</option>
                        </select>
                    </div>
                    {filtersActive && <button className={styles.secondaryBtn} onClick={clearFilters}>Clear</button>}
                </div>

                <form onSubmit={handleAddCategory} className={styles.toolbar}>
                    <div className={`${styles.formRow} ${styles.toolbarGrow}`}>
                        <label>New Category</label>
                        <input placeholder="e.g. Electronics" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                    </div>
                    <button type="submit" className={styles.secondaryBtn}>Add Category</button>
                </form>

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={fetchAll}>Retry</button>
                    </div>
                )}

                {loading && <p className={styles.emptyState}>Loading products...</p>}

                {!loading && !loadError && visibleProducts.length === 0 && (
                    <p className={styles.emptyState}>
                        {products.length === 0 ? "No products yet. Add your first product to get started." : "No products match your filters."}
                    </p>
                )}

                {!loading && visibleProducts.length > 0 && (
                    <>
                        <p className={styles.resultCount}>Showing {visibleProducts.length} of {products.length}</p>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th>Category</th>
                                        <th>Supplier</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleProducts.map((p) => {
                                        const status = stockStatus(p)
                                        const badge = { out: styles.badgeLow, low: styles.badgeWarn, ok: styles.badgeOk }[status]
                                        const label = { out: "Out of Stock", low: "Low Stock", ok: "In Stock" }[status]
                                        return (
                                            <tr key={p._id}>
                                                <td>{p.name}</td>
                                                <td className={styles.mono}>{p.sku}</td>
                                                <td>{p.category ? p.category.name : "—"}</td>
                                                <td>{p.supplier ? p.supplier.name : "—"}</td>
                                                <td className={styles.mono}>₹{p.price.toLocaleString("en-IN")}</td>
                                                <td className={styles.mono}>{p.quantity} {p.unit}</td>
                                                <td><span className={`${styles.badge} ${badge}`}>{label}</span></td>
                                                <td className={styles.actionsCell}>
                                                    <button className={styles.linkBtn} onClick={() => handleEdit(p)}>Edit</button>
                                                    {isAdmin() && <button className={styles.deleteBtn} onClick={() => setProductToDelete(p)}>Delete</button>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
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

                {productToDelete && (
                    <ConfirmDialog
                        title="Delete product?"
                        message={`"${productToDelete.name}" will be removed from inventory. Its past stock history stays in the ledger.`}
                        onConfirm={confirmDelete}
                        onCancel={() => setProductToDelete(null)}
                    />
                )}
            </div>
        </Layout>
    )
}

export default ProductsPage
