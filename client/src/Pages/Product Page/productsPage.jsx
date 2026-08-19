import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import ProductForm from "../../Components/Product Component/productForm"

function ProductsPage() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [newCategory, setNewCategory] = useState("")

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
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    async function handleDelete(id) {
        if (!window.confirm("Delete this product?")) return
        try {
            await api.delete(`/products/${id}`)
            fetchAll()
        } catch (error) {
            console.log(error)
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
        setShowForm(false)
        setEditingProduct(null)
        fetchAll()
    }

    async function handleAddCategory(e) {
        e.preventDefault()
        if (!newCategory.trim()) return
        try {
            await api.post("/categories", { name: newCategory.trim() })
            setNewCategory("")
            fetchAll()
        } catch (error) {
            console.log(error)
        }
    }

    const filteredProducts = products.filter((p) => {
        const term = search.toLowerCase()
        return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    })

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Products</h1>
                        <p className={styles.pageSubtitle}>{products.length} products tracked in inventory</p>
                    </div>
                    <button className={styles.primaryBtn} onClick={handleAddNew}>+ Add Product</button>
                </div>

                <div className={styles.formGrid} style={{ marginBottom: 20, alignItems: "end" }}>
                    <div className={styles.formRow} style={{ marginBottom: 0 }}>
                        <label>Search Products</label>
                        <input placeholder="Search by name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <form onSubmit={handleAddCategory} className={styles.formRow} style={{ marginBottom: 0, flexDirection: "row", gap: 8 }}>
                        <input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ flex: 1 }} />
                        <button type="submit" className={styles.secondaryBtn}>Add Category</button>
                    </form>
                </div>

                {loading && <p className={styles.emptyState}>Loading products...</p>}

                {!loading && filteredProducts.length === 0 && (
                    <p className={styles.emptyState}>No products found. Add your first product to get started.</p>
                )}

                {!loading && filteredProducts.length > 0 && (
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
                            {filteredProducts.map((p) => {
                                const isLow = p.quantity <= p.reorderLevel
                                return (
                                    <tr key={p._id}>
                                        <td>{p.name}</td>
                                        <td className={styles.mono}>{p.sku}</td>
                                        <td>{p.category ? p.category.name : "—"}</td>
                                        <td>{p.supplier ? p.supplier.name : "—"}</td>
                                        <td className={styles.mono}>₹{p.price}</td>
                                        <td className={styles.mono}>{p.quantity} {p.unit}</td>
                                        <td>
                                            <span className={`${styles.badge} ${isLow ? styles.badgeLow : styles.badgeOk}`}>
                                                {isLow ? "Low Stock" : "In Stock"}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <button className={styles.linkBtn} onClick={() => handleEdit(p)}>Edit</button>
                                            <button className={styles.deleteBtn} onClick={() => handleDelete(p._id)}>Delete</button>
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
            </div>
        </Layout>
    )
}

export default ProductsPage
