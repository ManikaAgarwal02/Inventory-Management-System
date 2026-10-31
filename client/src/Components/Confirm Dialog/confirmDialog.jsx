import styles from "../../Styles/page.module.css"

function ConfirmDialog({ title, message, confirmText = "Delete", onConfirm, onCancel }) {
    return (
        <div className={styles.modalOverlay} onClick={onCancel}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>{title}</h3>
                <p className={styles.confirmText}>{message}</p>
                <div className={styles.modalActions}>
                    <button className={styles.secondaryBtn} onClick={onCancel}>Cancel</button>
                    <button className={styles.dangerBtn} onClick={onConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog
