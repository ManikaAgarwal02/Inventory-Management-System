import Navbar from "./navbar"
import styles from "./navbar.module.css"

function Layout({ children }) {
    return (
        <>
            <Navbar />
            <main className={styles.content}>{children}</main>
        </>
    )
}

export default Layout
