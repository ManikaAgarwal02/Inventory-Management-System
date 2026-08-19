import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"
import SupplierForm from "../../Components/Supplier Component/supplierForm"

function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState(null)

    async function fetchSuppliers() {
        try {
            setLoading(true)
            const response = await api.get("/suppliers")
            setSuppliers(response.data.data || [])
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSuppliers()
    }, [])

    async function handleDelete(id) {
        if (!window.confirm("Remove this supplier?")) return
        try {
            await api.delete(`/suppliers/${id}`)
            fetchSuppliers()
        } catch (error) {
            console.log(error)
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
        setShowForm(false)
        setEditingSupplier(null)
        fetchSuppliers()
    }

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

                {loading && <p className={styles.emptyState}>Loading suppliers...</p>}

                {!loading && suppliers.length === 0 && (
                    <p className={styles.emptyState}>No suppliers added yet.</p>
                )}

                {!loading && suppliers.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((s) => (
                                <tr key={s._id}>
                                    <td>{s.name}</td>
                                    <td>{s.email || "—"}</td>
                                    <td>{s.phone || "—"}</td>
                                    <td>{s.address || "—"}</td>
                                    <td className={styles.actionsCell}>
                                        <button className={styles.linkBtn} onClick={() => handleEdit(s)}>Edit</button>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(s._id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {showForm && (
                    <SupplierForm supplier={editingSupplier} onClose={() => setShowForm(false)} onSaved={handleSaved} />
                )}
            </div>
        </Layout>
    )
}

export default SuppliersPage
