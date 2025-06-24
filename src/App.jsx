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

// Get current month in YYYY-MM format
const currentMonth = new Date().toISOString().slice(0, 7);

// Mock data for demonstration
const mockAccounts = [
  { id: 1, name: 'Checking Account', balance: 2500 },
  { id: 2, name: 'Savings Account', balance: 15000 },
  { id: 3, name: 'Credit Card', balance: -500 }
]

const mockTransactions = [
  { id: 1, date: `${currentMonth}-15`, amount: -125.50, description: 'Whole Foods', category: 'groceries', account_id: 1 },
  { id: 2, date: `${currentMonth}-14`, amount: -18.75, description: 'Uber Ride', category: 'transportation', account_id: 1 },
  { id: 3, date: `${currentMonth}-13`, amount: -15.99, description: 'Netflix Subscription', category: 'entertainment', account_id: 1 },
  { id: 4, date: `${currentMonth}-12`, amount: -4.50, description: 'Coffee Shop', category: 'food_dining', account_id: 2 }
]

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
        <Route index element={<Dashboard accounts={mockAccounts} transactions={mockTransactions} />} />
        <Route path="dashboard" element={<Dashboard accounts={mockAccounts} transactions={mockTransactions} />} />
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