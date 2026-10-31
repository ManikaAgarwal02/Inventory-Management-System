import { useEffect } from "react"
import styles from "./Toast.module.css"

function Toast({ message, type = "info", onClose, duration = 3500 }) {
    useEffect(() => {
        if (!message) return
        const timer = setTimeout(() => {
            onClose()
        }, duration)
        return () => clearTimeout(timer)
    }, [message, duration, onClose])

    if (!message) return null

    let typeClass = styles.toastInfo
    if (type === "success") typeClass = styles.toastSuccess
    if (type === "error") typeClass = styles.toastError

    return (
        <div className={styles.toastContainer}>
            <div className={`${styles.toast} ${typeClass}`}>
                <span>{message}</span>
                <button className={styles.closeBtn} onClick={onClose} title="Dismiss">
                    &times;
                </button>
            </div>
        </div>
    )
}

export default Toast
