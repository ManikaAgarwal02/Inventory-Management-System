import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import SupplierForm from "../../Components/Supplier Component/supplierForm"
import ConfirmModal from "../../Components/ConfirmModal/confirmModal"
import Toast from "../../Components/Toast/Toast"

function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, supplierId: null, supplierName: "" })
    const [toast, setToast] = useState({ message: "", type: "info" })

    async function fetchSuppliers() {
        try {
            setLoading(true)
            const response = await api.get("/suppliers")
            setSuppliers(response.data.data || [])
        } catch (error) {
            console.log("Error loading suppliers:", error)
            setToast({
                message: error.response?.data?.message || "Failed to load suppliers",
                type: "error"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSuppliers()
    }, [])

    function confirmDelete(supplier) {
        setDeleteModal({
            isOpen: true,
            supplierId: supplier._id,
            supplierName: supplier.name
        })
    }

    async function handleDeleteConfirmed() {
        const id = deleteModal.supplierId
        const name = deleteModal.supplierName
        setDeleteModal({ isOpen: false, supplierId: null, supplierName: "" })

        try {
            await api.delete(`/suppliers/${id}`)
            setToast({ message: `Supplier "${name}" removed successfully`, type: "success" })
            fetchSuppliers()
        } catch (error) {
            setToast({
                message: error.response?.data?.message || "Failed to delete supplier",
                type: "error"
            })
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

    function handleSaved(msg) {
        setShowForm(false)
        setEditingSupplier(null)
        setToast({ message: msg || "Supplier saved successfully!", type: "success" })
        fetchSuppliers()
    }

    const filteredSuppliers = suppliers.filter((s) => {
        const term = search.toLowerCase()
        return (
            s.name.toLowerCase().includes(term) ||
            (s.email && s.email.toLowerCase().includes(term)) ||
            (s.phone && s.phone.toLowerCase().includes(term)) ||
            (s.address && s.address.toLowerCase().includes(term))
        )
    })

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Suppliers Directory</h1>
                        <p className={styles.pageSubtitle}>
                            {suppliers.length} active suppliers and procurement contacts
                        </p>
                    </div>
                    <button className={styles.primaryBtn} onClick={handleAddNew}>+ Add Supplier</button>
                </div>

                {/* SEARCH TOOLBAR */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <input
                            className={styles.searchInput}
                            placeholder="🔍 Search supplier by name, email, phone, or address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={styles.toolbarRight} style={{ fontSize: 13, color: "#6e7681" }}>
                        Showing {filteredSuppliers.length} of {suppliers.length} suppliers
                    </div>
                </div>

                {loading && <p className={styles.emptyState}>Loading suppliers directory...</p>}

                {!loading && filteredSuppliers.length === 0 && (
                    <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ margin: "0 0 12px 0", color: "#6e7681", fontSize: 15 }}>
                            {suppliers.length === 0
                                ? "No suppliers added yet. Add your first supplier to link with products."
                                : "No suppliers matched your search query."}
                        </p>
                        {suppliers.length === 0 && (
                            <button className={styles.primaryBtn} onClick={handleAddNew}>
                                + Add First Supplier
                            </button>
                        )}
                    </div>
                )}

                {!loading && filteredSuppliers.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Supplier Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Created Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.map((s) => (
                                <tr key={s._id}>
                                    <td><strong>{s.name}</strong></td>
                                    <td>{s.email ? <a href={`mailto:${s.email}`} style={{ color: "#0969da" }}>{s.email}</a> : <span style={{ color: "#8c959f" }}>—</span>}</td>
                                    <td className={styles.mono}>{s.phone || <span style={{ color: "#8c959f" }}>—</span>}</td>
                                    <td>{s.address || <span style={{ color: "#8c959f" }}>—</span>}</td>
                                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                                    <td className={styles.actionsCell}>
                                        <button className={styles.linkBtn} onClick={() => handleEdit(s)}>Edit</button>
                                        <button className={styles.deleteBtn} onClick={() => confirmDelete(s)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {showForm && (
                    <SupplierForm supplier={editingSupplier} onClose={() => setShowForm(false)} onSaved={handleSaved} />
                )}

                <ConfirmModal
                    isOpen={deleteModal.isOpen}
                    title="Remove Supplier"
                    message={`Are you sure you want to remove supplier "${deleteModal.supplierName}"?`}
                    confirmText="Remove Supplier"
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setDeleteModal({ isOpen: false, supplierId: null, supplierName: "" })}
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

export default SuppliersPage
