export function saveSession(token, user) {
    localStorage.setItem("Token", token)
    localStorage.setItem("User", JSON.stringify(user))
}

export function getUser() {
    const raw = localStorage.getItem("User")
    return raw ? JSON.parse(raw) : null
}

export function getToken() {
    return localStorage.getItem("Token")
}

export function isLoggedIn() {
    return !!getToken()
}

export function isAdmin() {
    const user = getUser()
    return user && user.role === "admin"
}

export function logout() {
    localStorage.removeItem("Token")
    localStorage.removeItem("User")
}
