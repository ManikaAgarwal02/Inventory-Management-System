import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import styles from "../../Styles/auth.module.css"
import api from "../../utils/api"
import { saveSession } from "../../utils/auth"

function LoginComponent() {
    const navigate = useNavigate()
    const [user, setUser] = useState({ email: "", password: "" })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    function handleChange(e) {
        setUser({
            ...user,
            [e.target.name]: e.target.value
        })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const response = await api.post("/loginRoute/api", user)
            saveSession(response.data.token, response.data.user)
            navigate("/dashboard")
        } catch (error) {
            setError(error.response?.data?.message || "Unable To Log In")
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <p className={styles.brandTitle}>Stockroom</p>
                    <p className={styles.brandSub}>Inventory Management</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label>Email</label>
                        <input type="email" name="email" placeholder="you@company.com" value={user.email} onChange={handleChange} required />
                    </div>

                    <div className={styles.formRow}>
                        <label>Password</label>
                        <input type="password" name="password" placeholder="Enter your password" value={user.password} onChange={handleChange} required />
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <button className={styles.submitBtn} type="submit" disabled={loading}>
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <p className={styles.switchText}>
                    New staff member? <Link to="/register">Create an account</Link>
                </p>
            </div>
        </section>
    )
}

export default LoginComponent
