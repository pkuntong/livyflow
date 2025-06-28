import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './Pages/Dashboard'
import Transactions from './Pages/Transactions'
import Budgets from './Pages/Budgets'
import Reports from './Pages/Reports'
import Accounts from './Pages/Accounts'
import Analytics from './Pages/Analytics'
import Settings from './Pages/Settings'
import Landing from './Landing'
import SignUp from './Pages/SignUp'
import Login from './Pages/Login'
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart, User } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Protected Route component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      
      {/* Protected App Routes */}
      <Route path="/app" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="reports" element={<Reports />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App 