import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './Landing'
import SignUp from './Pages/SignUp'
import Login from './Pages/Login'
import { 
  LazyDashboard, 
  LazyTransactions, 
  LazyBudgets, 
  LazyReports, 
  LazyAccounts, 
  LazyAnalytics, 
  LazySettings,
  SuspenseWrapper,
  CardSkeleton
} from './utils/lazyLoading'

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
  const loadingFallback = (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 p-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );

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
        <Route index element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyDashboard />
          </SuspenseWrapper>
        } />
        <Route path="dashboard" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyDashboard />
          </SuspenseWrapper>
        } />
        <Route path="transactions" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyTransactions />
          </SuspenseWrapper>
        } />
        <Route path="budgets" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyBudgets />
          </SuspenseWrapper>
        } />
        <Route path="reports" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyReports />
          </SuspenseWrapper>
        } />
        <Route path="accounts" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyAccounts />
          </SuspenseWrapper>
        } />
        <Route path="analytics" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazyAnalytics />
          </SuspenseWrapper>
        } />
        <Route path="settings" element={
          <SuspenseWrapper fallback={loadingFallback}>
            <LazySettings />
          </SuspenseWrapper>
        } />
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