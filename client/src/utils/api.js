import axios from "axios"
import { logout } from "./auth"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("Token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// If the token is missing/expired, clear the session and go back to login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthCall = error.config?.url?.includes("/loginRoute/api")
        if (error.response?.status === 401 && !isAuthCall) {
            logout()
            window.location.href = "/login"
        }
        return Promise.reject(error)
    }
)

export function getErrorMessage(error, fallback = "Something went wrong") {
    return error.response?.data?.message || fallback
}

export default api
