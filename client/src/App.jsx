import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './Pages/Login Page/loginPage'
import SignupPage from './Pages/Signup Page/signupPage'
import RegistrationPage from './Pages/Registration Page/registrationPage'
import Dashboard from './Pages/Dashboard Page/dashboard'
import ProductsPage from './Pages/Products Page/productsPage'
import SuppliersPage from './Pages/Suppliers Page/suppliersPage'
import StockPage from './Pages/Stock Page/stockPage'
import AlertsPage from './Pages/Alerts Page/alertsPage'
import ProtectedRoute from './Components/Protected Route/protectedRoute'
import { isLoggedIn } from './utils/auth'

function PublicRoute({ children }) {
  if (isLoggedIn()) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        <Route path="/register" element={
          <PublicRoute><SignupPage /></PublicRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute><ProductsPage /></ProtectedRoute>
        } />

        <Route path="/suppliers" element={
          <ProtectedRoute><SuppliersPage /></ProtectedRoute>
        } />

        <Route path="/stock" element={
          <ProtectedRoute><StockPage /></ProtectedRoute>
        } />

        <Route path="/alerts" element={
          <ProtectedRoute><AlertsPage /></ProtectedRoute>
        } />

        {/* Admin-only staff management: registration list with edit/delete */}
        <Route path="/users" element={
          <ProtectedRoute adminOnly><RegistrationPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
