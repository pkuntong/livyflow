import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './Landing'
import SignUp from './Pages/SignUp'
import Login from './Pages/Login'
import Dashboard from './Pages/Dashboard'
import Transactions from './Pages/Transactions'
import Budgets from './Pages/Budgets'
import Reports from './Pages/Reports'
import Accounts from './Pages/Accounts'
import Analytics from './Pages/Analytics'
import Settings from './Pages/Settings'

import { AuthProvider, useAuth } from './contexts/AuthContext'

// Development tools component - completely disabled for production builds
function DevTools() {
  // Always return null to avoid any import issues in Vercel
  return null;
}

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
    <>
      {/* Development tools - only loads in dev mode */}
      <DevTools />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </>
  )
}

export default App 