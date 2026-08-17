import styles from "./registeredCard.module.css"
function UserRegisterdCard(props) {

  function handleEdit() {
    props.onEdit(props.id)
  }

  function handleDelete() {
    props.OnDelete(props.id)
  }

  return (
    <div className={styles.cardContainer}>
      {props.role && <span className={styles.roleTag}>{props.role}</span>}
      <div>Name: <strong>{props.name}</strong></div>
      <div>Email: <strong>{props.email}</strong></div>

      <div className={styles.btnContainer}>
        <button className={styles.editBtn} onClick={handleEdit}>Edit</button>
        <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
      </div>
    </div>
  )
}

export default UserRegisterdCard
