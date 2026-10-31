import styles from "../../Styles/page.module.css"

function ConfirmModal({ isOpen, title = "Confirm Action", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, isDanger = true }) {
    if (!isOpen) return null

    return (
        <div className={styles.modalOverlay} onClick={onCancel}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
                <h3 className={styles.modalTitle}>{title}</h3>
                <p style={{ fontSize: 14, color: "#57606a", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                    {message}
                </p>
                <div className={styles.modalActions}>
                    <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={isDanger ? styles.dangerBtn : styles.primaryBtn}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmModal
