import { useState } from "react"
import api from "../../../utils/api"
import styles from "../../../Styles/page.module.css"

function UpdateRegisterCard({ user, onClose, id }) {
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || ""
    })

    function handleChange(e) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    async function handleUpdate(e) {
        e.preventDefault()
        try {
            await api.put(`/user/update/${id._id}`, formData)
            onClose()
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
                <h3 className={styles.modalTitle}>Update Staff Member</h3>

                <div className={styles.formRow}>
                    <label>Name</label>
                    <input onChange={handleChange} type="text" name="name" placeholder="Update Name" value={formData.name} />
                </div>

                <div className={styles.formRow}>
                    <label>Email</label>
                    <input onChange={handleChange} type="text" name="email" placeholder="Update Email" value={formData.email} />
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                    <button className={styles.primaryBtn} onClick={handleUpdate}>Save Changes</button>
                </div>
            </div>
        </div>
    )
}
export default UpdateRegisterCard;
