import { useEffect, useState } from "react"
import styles from "../../Styles/page.module.css"
import api from "../../utils/api"

const emptyForm = { name: "", email: "", phone: "", address: "" }

function SupplierForm({ supplier, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

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

        if (!form.name.trim()) {
            setError("Supplier name is required.")
            return
        }

        try {
            setLoading(true)
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                address: form.address.trim()
            }

            if (supplier) {
                await api.put(`/suppliers/${supplier._id}`, payload)
                onSaved(`Supplier "${payload.name}" updated successfully!`)
            } else {
                await api.post("/suppliers", payload)
                onSaved(`Supplier "${payload.name}" added successfully!`)
            }
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save supplier")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>{supplier ? "Edit Supplier" : "Add Supplier"}</h3>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label>Supplier Name *</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="e.g. Apex Electronics Ltd."
                            required
                        />
                    </div>
                    <div className={styles.formRow}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="orders@supplier.com"
                        />
                    </div>
                    <div className={styles.formRow}>
                        <label>Phone Number</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+91 98765 43210"
                        />
                    </div>
                    <div className={styles.formRow}>
                        <label>Warehouse / Office Address</label>
                        <textarea
                            name="address"
                            rows={3}
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Street, City, Postal Code"
                        />
                    </div>

                    {error && (
                        <div style={{ color: "#cf222e", background: "#ffebe9", border: "1px solid #ffc1c0", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                            {error}
                        </div>
                    )}

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.primaryBtn} disabled={loading}>
                            {loading ? "Saving..." : supplier ? "Update Supplier" : "Add Supplier"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SupplierForm
