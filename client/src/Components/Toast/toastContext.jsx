import { createContext, useCallback, useContext, useState } from "react"
import styles from "../../Styles/page.module.css"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = "success") => {
        const id = Date.now() + Math.random()
        setToasts((current) => [...current, { id, message, type }])
        setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== id))
        }, 3500)
    }, [])

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className={styles.toastStack} aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`${styles.toast} ${t.type === "error" ? styles.toastError : styles.toastSuccess}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    return useContext(ToastContext)
}
