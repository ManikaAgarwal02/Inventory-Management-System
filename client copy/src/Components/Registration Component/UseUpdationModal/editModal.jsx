import { useState } from "react"
import api, { getErrorMessage } from "../../../utils/api"
import styles from "../../../Styles/page.module.css"

function UpdateRegisterCard({ user, onClose, onSaved }) {
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        role: user?.role || "staff",
        isActive: user?.isActive !== false
    })
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    function handleChange(e) {
        const val = e.target.name === "isActive" ? e.target.value === "true" : e.target.value
        setFormData({
            ...formData,
            [e.target.name]: val
        })
    }

    async function handleUpdate(e) {
        e.preventDefault()
        setError("")
        setSaving(true)
        try {
            await api.put(`/user/update/${user._id}`, formData)
            onSaved()
        } catch (err) {
            setError(getErrorMessage(err, "Unable to update staff member"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <form className={styles.modalBox} onSubmit={handleUpdate}>
                <h3 className={styles.modalTitle}>Update Staff Member</h3>

                <div className={styles.formRow}>
                    <label>Name</label>
                    <input onChange={handleChange} type="text" name="name" placeholder="Update Name" value={formData.name} required />
                </div>

                <div className={styles.formRow}>
                    <label>Email</label>
                    <input onChange={handleChange} type="email" name="email" placeholder="Update Email" value={formData.email} required />
                </div>

                <div className={styles.formRow}>
                    <label>Role</label>
                    <select onChange={handleChange} name="role" value={formData.role}>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div className={styles.formRow}>
                    <label>Account Status</label>
                    <select onChange={handleChange} name="isActive" value={formData.isActive ? "true" : "false"}>
                        <option value="true">Active (Access Allowed)</option>
                        <option value="false">Deactivated (Access Denied)</option>
                    </select>
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <div className={styles.modalActions}>
                    <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                    <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                </div>
            </form>
        </div>
    )
}
export default UpdateRegisterCard;
