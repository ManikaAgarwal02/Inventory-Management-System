import { useEffect, useState } from "react"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { getToken, saveSession } from "../../utils/auth"
import { useToast } from "../../Components/Toast/toastContext"

function ProfilePage() {
    const showToast = useToast()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [form, setForm] = useState({ name: "", email: "" })
    const [formError, setFormError] = useState("")
    const [saving, setSaving] = useState(false)
    const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
    const [pwError, setPwError] = useState("")
    const [pwSaving, setPwSaving] = useState(false)

    async function load() {
        try {
            const res = await api.get("/profile")
            setProfile(res.data.data)
            setForm({ name: res.data.data.name, email: res.data.data.email })
            setLoadError("")
        } catch (error) {
            setLoadError(getErrorMessage(error, "Unable to load profile"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // initial data load
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load()
    }, [])

    async function saveProfile(e) {
        e.preventDefault()
        setFormError("")
        if (!form.name.trim()) return setFormError("Name is required")
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError("Please enter a valid email address")
        setSaving(true)
        try {
            const res = await api.put("/profile", form)
            setProfile(res.data.data)
            // keep the sidebar name in sync
            saveSession(getToken(), { id: res.data.data.id, name: res.data.data.name, email: res.data.data.email, role: res.data.data.role })
            showToast("Profile updated")
        } catch (error) {
            setFormError(getErrorMessage(error, "Unable to update profile"))
        } finally {
            setSaving(false)
        }
    }

    async function changePassword(e) {
        e.preventDefault()
        setPwError("")
        if (!pw.currentPassword || !pw.newPassword || !pw.confirmPassword) return setPwError("Fill in all three password fields")
        if (pw.newPassword.length < 6) return setPwError("New password must be at least 6 characters")
        if (pw.newPassword !== pw.confirmPassword) return setPwError("New password and confirmation do not match")
        if (pw.newPassword === pw.currentPassword) return setPwError("New password must be different from the current one")
        setPwSaving(true)
        try {
            await api.put("/profile/password", pw)
            setPw({ currentPassword: "", newPassword: "", confirmPassword: "" })
            showToast("Password changed")
        } catch (error) {
            setPwError(getErrorMessage(error, "Unable to change password"))
        } finally {
            setPwSaving(false)
        }
    }

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>My Profile</h1>
                        <p className={styles.pageSubtitle}>Manage your account details and password</p>
                    </div>
                </div>

                {loadError && <div className={styles.errorBox}><span>{loadError}</span><button className={styles.secondaryBtn} onClick={load}>Retry</button></div>}
                {loading && <p className={styles.emptyState}>Loading profile...</p>}

                {profile && (
                    <div className={styles.twoCol} style={{ alignItems: "start" }}>
                        <div className={styles.card}>
                            <div className={styles.profileHead}>
                                <div className={styles.avatar}>{profile.name.trim().charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style={{ fontSize: 18 }}>{profile.name}</div>
                                    <span className={`${styles.badge} ${profile.role === "admin" ? styles.badgeWarn : styles.badgeNeutral}`}>{profile.role}</span>
                                    <div className={styles.mutedText} style={{ marginTop: 4 }}>Member since {new Date(profile.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <form onSubmit={saveProfile} noValidate>
                                <div className={styles.formRow}><label>Name</label><input value={form.name} maxLength="80" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                                <div className={styles.formRow}><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                                <div className={styles.formRow}><label>Role</label><input value={profile.role} disabled /></div>
                                {formError && <p className={styles.errorText}>{formError}</p>}
                                <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                            </form>
                        </div>

                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>Change Password</h3>
                            <form onSubmit={changePassword} noValidate>
                                <div className={styles.formRow}><label>Current Password</label><input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
                                <div className={styles.formRow}><label>New Password</label><input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
                                <div className={styles.formRow}><label>Confirm New Password</label><input type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} /></div>
                                <p className={styles.mutedText} style={{ marginTop: 0 }}>At least 6 characters.</p>
                                {pwError && <p className={styles.errorText}>{pwError}</p>}
                                <button type="submit" className={styles.primaryBtn} disabled={pwSaving}>{pwSaving ? "Updating..." : "Update Password"}</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default ProfilePage
