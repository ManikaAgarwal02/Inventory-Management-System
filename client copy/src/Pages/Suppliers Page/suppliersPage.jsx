import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import SupplierForm from "../../Components/Supplier Component/supplierForm"
import ConfirmDialog from "../../Components/Confirm Dialog/confirmDialog"
import { useToast } from "../../Components/Toast/toastContext"
import { isAdmin } from "../../utils/auth"

function SuppliersPage() {
    const showToast = useToast()
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [supplierToDelete, setSupplierToDelete] = useState(null)

    async function fetchSuppliers() {
        try {
            const response = await api.get("/suppliers")
            setSuppliers(response.data.data || [])
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load suppliers"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchSuppliers()
    }, [])

    async function confirmDelete() {
        try {
            await api.delete(`/suppliers/${supplierToDelete._id}`)
            showToast("Supplier removed")
            fetchSuppliers()
        } catch (error) {
            showToast(getErrorMessage(error, "Unable to remove supplier"), "error")
        } finally {
            setSupplierToDelete(null)
        }
    }

    function handleEdit(supplier) {
        setEditingSupplier(supplier)
        setShowForm(true)
    }

    function handleAddNew() {
        setEditingSupplier(null)
        setShowForm(true)
    }

    function handleSaved() {
        showToast(editingSupplier ? "Supplier updated" : "Supplier added")
        setShowForm(false)
        setEditingSupplier(null)
        fetchSuppliers()
    }

    const term = search.trim().toLowerCase()
    const visibleSuppliers = suppliers.filter((s) =>
        !term ||
        s.name.toLowerCase().includes(term) ||
        (s.email || "").toLowerCase().includes(term) ||
        (s.phone || "").includes(term)
    )

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Suppliers</h1>
                        <p className={styles.pageSubtitle}>{suppliers.length} suppliers on record</p>
                    </div>
                    <button className={styles.primaryBtn} onClick={handleAddNew}>+ Add Supplier</button>
                </div>

                <div className={styles.toolbar}>
                    <div className={`${styles.formRow} ${styles.toolbarGrow}`}>
                        <label>Search Suppliers</label>
                        <input placeholder="Name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {loadError && (
                    <div className={styles.errorBox}>
                        <span>{loadError}</span>
                        <button className={styles.secondaryBtn} onClick={fetchSuppliers}>Retry</button>
                    </div>
                )}

                {loading && <p className={styles.emptyState}>Loading suppliers...</p>}

                {!loading && !loadError && visibleSuppliers.length === 0 && (
                    <p className={styles.emptyState}>
                        {suppliers.length === 0 ? "No suppliers added yet." : "No suppliers match your search."}
                    </p>
                )}

                {!loading && visibleSuppliers.length > 0 && (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Address</th>
                                    <th>Products</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleSuppliers.map((s) => (
                                    <tr key={s._id}>
                                        <td>{s.name}</td>
                                        <td>{s.email || "—"}</td>
                                        <td>{s.phone || "—"}</td>
                                        <td>{s.address || "—"}</td>
                                        <td className={styles.mono}>{s.productCount}</td>
                                        <td className={styles.actionsCell}>
                                            <button className={styles.linkBtn} onClick={() => handleEdit(s)}>Edit</button>
                                            {isAdmin() && <button className={styles.deleteBtn} onClick={() => setSupplierToDelete(s)}>Delete</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showForm && (
                    <SupplierForm supplier={editingSupplier} onClose={() => setShowForm(false)} onSaved={handleSaved} />
                )}

                {supplierToDelete && (
                    <ConfirmDialog
                        title="Remove supplier?"
                        message={supplierToDelete.productCount > 0
                            ? `"${supplierToDelete.name}" supplies ${supplierToDelete.productCount} product(s). Those products will be kept but will have no supplier.`
                            : `"${supplierToDelete.name}" will be removed.`}
                        confirmText="Remove"
                        onConfirm={confirmDelete}
                        onCancel={() => setSupplierToDelete(null)}
                    />
                )}
            </div>
        </Layout>
    )
}

export default SuppliersPage
