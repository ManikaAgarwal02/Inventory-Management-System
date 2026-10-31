import { useState } from "react"
import { Link } from "react-router-dom"
import styles from "../../Styles/auth.module.css"
import api, { getErrorMessage } from "../../utils/api"

function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [done, setDone] = useState(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address")
        setLoading(true)
        try {
            const res = await api.post("/auth/forgot-password", { email })
            setDone(res.data)
        } catch (err) {
            setError(getErrorMessage(err, "Unable to process the request"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <p className={styles.brandTitle}>Reset password</p>
                    <p className={styles.brandSub}>Stockroom</p>
                </div>

                {!done ? (
                    <form onSubmit={handleSubmit} noValidate>
                        <div className={styles.formRow}>
                            <label>Email</label>
                            <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        {error && <p className={styles.errorText}>{error}</p>}
                        <button className={styles.submitBtn} type="submit" disabled={loading}>{loading ? "Please wait..." : "Send reset link"}</button>
                    </form>
                ) : (
                    <div>
                        <p style={{ fontSize: 14, color: "#57606a", lineHeight: 1.5 }}>{done.message}</p>
                        <p style={{ fontSize: 13, color: "#6e7681", lineHeight: 1.5 }}>This app has no mail server, so the link is printed in the server console. Ask your administrator if you can&apos;t access it.</p>
                        {done.resetLink && <p style={{ fontSize: 13 }}><Link to={done.resetLink.replace(/^https?:\/\/[^/]+/, "")}>Open reset link (demo mode)</Link></p>}
                    </div>
                )}

                <p className={styles.switchText}><Link to="/login">Back to sign in</Link></p>
            </div>
        </section>
    )
}

export default ForgotPasswordPage
