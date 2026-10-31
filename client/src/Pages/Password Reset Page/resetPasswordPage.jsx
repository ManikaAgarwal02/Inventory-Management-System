import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import styles from "../../Styles/auth.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { useToast } from "../../Components/Toast/toastContext"

function ResetPasswordPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const showToast = useToast()
    const [form, setForm] = useState({ newPassword: "", confirmPassword: "" })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        if (form.newPassword.length < 6) return setError("Password must be at least 6 characters")
        if (form.newPassword !== form.confirmPassword) return setError("Passwords do not match")
        setLoading(true)
        try {
            await api.post("/auth/reset-password", { token, ...form })
            showToast("Password reset. Please sign in.")
            navigate("/login")
        } catch (err) {
            setError(getErrorMessage(err, "Unable to reset password"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <p className={styles.brandTitle}>Choose a new password</p>
                    <p className={styles.brandSub}>Stockroom</p>
                </div>
                <form onSubmit={handleSubmit} noValidate>
                    <div className={styles.formRow}><label>New Password</label><input type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></div>
                    <div className={styles.formRow}><label>Confirm Password</label><input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></div>
                    {error && <p className={styles.errorText}>{error}</p>}
                    <button className={styles.submitBtn} type="submit" disabled={loading}>{loading ? "Saving..." : "Reset password"}</button>
                </form>
                <p className={styles.switchText}><Link to="/login">Back to sign in</Link></p>
            </div>
        </section>
    )
}

export default ResetPasswordPage
