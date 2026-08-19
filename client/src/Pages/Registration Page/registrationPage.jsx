import { useEffect, useState } from 'react'
import Layout from '../../Components/Navbar/layout'
import pageStyles from '../../Styles/page.module.css'
import styles from './registrationPage.module.css'
import UserRegisterdCard from '../../Components/Registration Component/user Registered Card/registerCard'
import api from '../../utils/api'
import UpdateRegisterCard from '../../Components/Registration Component/UseUpdationModal/editModal'

function RegistrationPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userData, setUserData] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchRegisteredUser() {
    try {
      setLoading(true)
      const response = await api.get("/getData")
      setUserData(response.data.data || [])
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this staff member?")) return
    try {
      await api.delete(`/user/delete/${id}`)
      fetchRegisteredUser()
    } catch (error) {
      console.log(error.message)
    }
  }

  function handleEdit(user) {
    setSelectedUser(user)
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
    fetchRegisteredUser()
  }

  useEffect(() => {
    fetchRegisteredUser()
  }, [])

  return (
    <Layout>
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Manage Staff</h1>
            <p className={pageStyles.pageSubtitle}>Everyone with access to Stockroom</p>
          </div>
        </div>

        {loading && <p className={pageStyles.emptyState}>Loading staff...</p>}

        {!loading && userData.length === 0 && (
          <p className={pageStyles.emptyState}>No staff accounts registered yet.</p>
        )}

        <div className={styles.cardContainer}>
          {userData.map((user) => (
            <div key={user._id}>
              <UserRegisterdCard id={user._id} OnDelete={handleDelete} name={user.name} email={user.email} role={user.role} onEdit={() => handleEdit(user)} />
            </div>
          ))}
        </div>

        {showModal && (
          <UpdateRegisterCard user={selectedUser} onClose={handleClose} id={selectedUser} />
        )}
      </div>
    </Layout>
  )
}

export default RegistrationPage
