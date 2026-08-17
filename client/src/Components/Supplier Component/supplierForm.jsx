import { useEffect, useState } from "react"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"

const emptyForm = { name: "", email: "", phone: "", address: "" }

function SupplierForm({ supplier, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState("")

    useEffect(() => {
        if (supplier) {
            setForm({
                name: supplier.name || "",
                email: supplier.email || "",
                phone: supplier.phone || "",
                address: supplier.address || ""
            })
        } else {
            setForm(emptyForm)
        }
    }, [supplier])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        try {
            if (supplier) {
                await api.put(`/suppliers/${supplier._id}`, form)
            } else {
                await api.post("/suppliers", form)
            }
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || "Unable To Save Supplier")
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
                <h3 className={styles.modalTitle}>{supplier ? "Edit Supplier" : "Add Supplier"}</h3>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label>Supplier Name</label>
                        <input name="name" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className={styles.formRow}>
                        <label>Email</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} />
                    </div>
                    <div className={styles.formRow}>
                        <label>Phone</label>
                        <input name="phone" value={form.phone} onChange={handleChange} />
                    </div>
                    <div className={styles.formRow}>
                        <label>Address</label>
                        <textarea name="address" rows={3} value={form.address} onChange={handleChange} />
                    </div>

                    {error && <p style={{ color: "#b3261e", fontSize: 13 }}>{error}</p>}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn}>{supplier ? "Save Changes" : "Add Supplier"}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SupplierForm
