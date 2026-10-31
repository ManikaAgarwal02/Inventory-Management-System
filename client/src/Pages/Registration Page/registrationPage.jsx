import { useEffect, useState } from 'react'
import Layout from '../../Components/Navbar/layout'
import pageStyles from '../../Styles/page.module.css'
import styles from './registrationPage.module.css'
import UserRegisterdCard from '../../Components/Registration Component/user Registered Card/registerCard'
import api, { getErrorMessage } from '../../utils/api'
import ConfirmDialog from '../../Components/Confirm Dialog/confirmDialog'
import { useToast } from '../../Components/Toast/toastContext'
import UpdateRegisterCard from '../../Components/Registration Component/UseUpdationModal/editModal'

function RegistrationPage() {
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userData, setUserData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [userToDelete, setUserToDelete] = useState(null)
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'staff' })
  const [addingStaff, setAddingStaff] = useState(false)
  const [addError, setAddError] = useState('')
  const showToast = useToast()

  async function fetchRegisteredUser() {
    try {
      const response = await api.get("/getData")
      setUserData(response.data.data || [])
      setLoadError("")
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Unable to load staff'))
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/user/delete/${userToDelete._id}`)
      showToast('Staff member removed')
      fetchRegisteredUser()
    } catch (error) {
      showToast(getErrorMessage(error, 'Unable to remove staff member'), 'error')
    } finally {
      setUserToDelete(null)
    }
  }

  function handleDelete(id) {
    setUserToDelete(userData.find((u) => u._id === id))
  }

  function handleEdit(user) {
    setSelectedUser(user)
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
  }

  function handleSaved() {
    showToast('Staff member updated')
    setShowModal(false)
    fetchRegisteredUser()
  }

  async function handleToggleStatus(id) {
    try {
      const res = await api.patch(`/user/toggle-status/${id}`)
      showToast(res.data.message || 'Status updated')
      fetchRegisteredUser()
    } catch (error) {
      showToast(getErrorMessage(error, 'Unable to change account status'), 'error')
    }
  }

  async function handleCreateStaffSubmit(e) {
    e.preventDefault()
    setAddError('')
    setAddingStaff(true)
    try {
      await api.post('/users', newStaff)
      showToast('New staff member added successfully')
      setShowAddModal(false)
      setNewStaff({ name: '', email: '', password: '', role: 'staff' })
      fetchRegisteredUser()
    } catch (error) {
      setAddError(getErrorMessage(error, 'Unable to add staff member'))
    } finally {
      setAddingStaff(false)
    }
  }

  useEffect(() => {
    // initial data load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRegisteredUser()
  }, [])

  return (
    <Layout>
      <div className={pageStyles.page}>
        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Manage Staff</h1>
            <p className={pageStyles.pageSubtitle}>Everyone with access to Stockroom ({userData.length} accounts)</p>
          </div>
          <div>
            <button className={pageStyles.primaryBtn} onClick={() => setShowAddModal(true)}>
              + Add Staff Member
            </button>
          </div>
        </div>

        {loadError && <p className={pageStyles.errorBox}>{loadError}</p>}

        {loading && <p className={pageStyles.emptyState}>Loading staff...</p>}

        {!loading && !loadError && userData.length === 0 && (
          <p className={pageStyles.emptyState}>No staff accounts registered yet.</p>
        )}

        <div className={styles.cardContainer}>
          {userData.map((user) => (
            <div key={user._id}>
              <UserRegisterdCard
                id={user._id}
                OnDelete={handleDelete}
                name={user.name}
                email={user.email}
                role={user.role}
                isActive={user.isActive}
                onToggleStatus={handleToggleStatus}
                onEdit={() => handleEdit(user)}
              />
            </div>
          ))}
        </div>

        {showModal && (
          <UpdateRegisterCard user={selectedUser} onClose={handleClose} onSaved={handleSaved} />
        )}

        {/* Add Staff Modal */}
        {showAddModal && (
          <div className={pageStyles.modalOverlay}>
            <form className={pageStyles.modalBox} onSubmit={handleCreateStaffSubmit}>
              <h3 className={pageStyles.modalTitle}>Add New Staff Member</h3>

              <div className={pageStyles.formRow}>
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  required
                />
              </div>

              <div className={pageStyles.formRow}>
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="employee@company.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  required
                />
              </div>

              <div className={pageStyles.formRow}>
                <label>Initial Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  minLength={6}
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  required
                />
              </div>

              <div className={pageStyles.formRow}>
                <label>Role</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="staff">Staff (Employee Panel)</option>
                  <option value="admin">Admin (Full System Access)</option>
                </select>
              </div>

              {addError && <p className={pageStyles.errorText}>{addError}</p>}

              <div className={pageStyles.modalActions}>
                <button
                  type="button"
                  className={pageStyles.secondaryBtn}
                  onClick={() => setShowAddModal(false)}
                  disabled={addingStaff}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={pageStyles.primaryBtn}
                  disabled={addingStaff}
                >
                  {addingStaff ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        )}

        {userToDelete && (
          <ConfirmDialog
            title="Remove staff member?"
            message={`${userToDelete.name} (${userToDelete.email}) will lose access to Stockroom.`}
            confirmText="Remove"
            onConfirm={confirmDelete}
            onCancel={() => setUserToDelete(null)}
          />
        )}
      </div>
    </Layout>
  )
}

export default RegistrationPage
