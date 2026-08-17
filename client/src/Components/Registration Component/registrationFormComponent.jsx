import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import styles from "../../Styles/auth.module.css"
import api from "../../utils/api"

function Register() {
    const navigate = useNavigate()
    const [user, setUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "staff"
    })
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
            await api.post("/registration/api", user)
            navigate("/login")
        } catch (error) {
            setError(error.response?.data?.message || "Registration Failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <p className={styles.brandTitle}>Stockroom</p>
                    <p className={styles.brandSub}>Create Your Account</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label>Full Name</label>
                        <input onChange={handleChange} value={user.name} type="text" name="name" placeholder="Enter your name" required />
                    </div>

                    <div className={styles.formRow}>
                        <label>Email</label>
                        <input onChange={handleChange} value={user.email} type="email" name="email" placeholder="you@company.com" required />
                    </div>

                    <div className={styles.formRow}>
                        <label>Password</label>
                        <input onChange={handleChange} value={user.password} type="password" name="password" placeholder="Create a password" required />
                    </div>

                    <div className={styles.formRow}>
                        <label>Role</label>
                        <select onChange={handleChange} value={user.role} name="role">
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <button className={styles.submitBtn} type="submit" disabled={loading}>
                        {loading ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <p className={styles.switchText}>
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </section>
    )
}
export default Register
