import styles from "./registeredCard.module.css"
function UserRegisterdCard(props) {
  const isActive = props.isActive !== false

  function handleEdit() {
    props.onEdit(props.id)
  }

  function handleDelete() {
    props.OnDelete(props.id)
  }

  function handleToggleStatus() {
    if (props.onToggleStatus) {
      props.onToggleStatus(props.id)
    }
  }

  return (
    <div className={styles.cardContainer}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {props.role && <span className={styles.roleTag}>{props.role}</span>}
        <span
          style={{
            fontSize: "11px",
            fontWeight: "600",
            padding: "2px 8px",
            borderRadius: "999px",
            background: isActive ? "#e5f6ea" : "#fdecea",
            color: isActive ? "#1a7f37" : "#b3261e"
          }}
        >
          {isActive ? "Active" : "Deactivated"}
        </span>
      </div>
      <div>Name: <strong>{props.name}</strong></div>
      <div style={{ wordBreak: "break-all" }}>Email: <strong>{props.email}</strong></div>

      <div className={styles.btnContainer}>
        <button className={styles.editBtn} onClick={handleEdit}>Edit</button>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            color: isActive ? "#8a5a00" : "#1a7f37"
          }}
          onClick={handleToggleStatus}
          title={isActive ? "Deactivate this account" : "Reactivate this account"}
        >
          {isActive ? "Deactivate" : "Activate"}
        </button>
        <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
      </div>
    </div>
  )
}

export default UserRegisterdCard
