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
import ActivityPage from './Pages/Activity Page/activityPage'
import PurchaseOrdersPage from './Pages/Purchase Orders Page/purchaseOrdersPage'
import WarehousesPage from './Pages/Warehouses Page/warehousesPage'
import TransfersPage from './Pages/Transfers Page/transfersPage'
import ReportsPage from './Pages/Reports Page/reportsPage'
import ImportPage from './Pages/Import Page/importPage'
import ProfilePage from './Pages/Profile Page/profilePage'
import ForgotPasswordPage from './Pages/Password Reset Page/forgotPasswordPage'
import ResetPasswordPage from './Pages/Password Reset Page/resetPasswordPage'
import HomePage from './Pages/Home Page/homePage'
import StaffDashboard from './Pages/Staff Page/staffDashboard'
import AdminStockRequestsPage from './Pages/Admin Stock Requests Page/adminStockRequestsPage'
import ProtectedRoute from './Components/Protected Route/protectedRoute'
import { isLoggedIn, isAdmin } from './utils/auth'

function PublicRoute({ children }) {
  if (isLoggedIn()) {
    return <Navigate to={isAdmin() ? "/dashboard" : "/staff"} replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<HomePage />} />

        {/* Public Auth Routes */}
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        <Route path="/register" element={
          <PublicRoute><SignupPage /></PublicRoute>
        } />

        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        {/* Staff / Employee Panel */}
        <Route path="/staff" element={
          <ProtectedRoute><StaffDashboard /></ProtectedRoute>
        } />

        {/* Admin Dashboard & Management Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute adminOnly><ProductsPage /></ProtectedRoute>
        } />

        <Route path="/products/import" element={
          <ProtectedRoute adminOnly><ImportPage /></ProtectedRoute>
        } />

        <Route path="/purchase-orders" element={
          <ProtectedRoute adminOnly><PurchaseOrdersPage /></ProtectedRoute>
        } />

        <Route path="/warehouses" element={
          <ProtectedRoute adminOnly><WarehousesPage /></ProtectedRoute>
        } />

        <Route path="/transfers" element={
          <ProtectedRoute adminOnly><TransfersPage /></ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        <Route path="/suppliers" element={
          <ProtectedRoute adminOnly><SuppliersPage /></ProtectedRoute>
        } />

        <Route path="/stock" element={
          <ProtectedRoute adminOnly><StockPage /></ProtectedRoute>
        } />

        <Route path="/alerts" element={
          <ProtectedRoute adminOnly><AlertsPage /></ProtectedRoute>
        } />

        {/* Admin Staff Stock Requests */}
        <Route path="/admin/requests" element={
          <ProtectedRoute adminOnly><AdminStockRequestsPage /></ProtectedRoute>
        } />

        {/* Admin-only staff management: registration list with edit/delete */}
        <Route path="/users" element={
          <ProtectedRoute adminOnly><RegistrationPage /></ProtectedRoute>
        } />

        <Route path="/activity" element={
          <ProtectedRoute adminOnly><ActivityPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
