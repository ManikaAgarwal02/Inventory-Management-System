import { NavLink, useNavigate } from "react-router-dom"
import styles from "./navbar.module.css"
import { getUser, isAdmin, logout } from "../../utils/auth"

function Navbar() {
    const navigate = useNavigate()
    const user = getUser()

    function handleLogout() {
        logout()
        navigate("/login")
    }

    function linkClass({ isActive }) {
        return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
    }

    return (
        <nav className={styles.sidebar}>
            <div className={styles.brand}>
                <p className={styles.brandTitle}>Stockroom</p>
                <p className={styles.brandSub}>Inventory Management</p>
            </div>

            <ul className={styles.navList}>
                <li><NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink></li>
                <li><NavLink to="/products" className={linkClass}>Products</NavLink></li>
                <li><NavLink to="/suppliers" className={linkClass}>Suppliers</NavLink></li>
                <li><NavLink to="/stock" className={linkClass}>Stock Ledger</NavLink></li>
                <li><NavLink to="/alerts" className={linkClass}>Low Stock Alerts</NavLink></li>
                {isAdmin() && <li><NavLink to="/users" className={linkClass}>Manage Staff</NavLink></li>}
            </ul>

            <div className={styles.footer}>
                <p className={styles.userName}>{user ? user.name : "Guest"}</p>
                <p className={styles.userRole}>{user ? user.role : ""}</p>
                <button className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
            </div>
        </nav>
    )
}

export default Navbar
