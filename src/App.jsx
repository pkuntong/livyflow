import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Accounts from './pages/Accounts'
import Analytics from './pages/Analytics'
import Landing from './Landing'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart, User } from 'lucide-react'

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

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        
        {/* Main App under /app */}
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard accounts={mockAccounts} transactions={mockTransactions} />} />
          <Route path="dashboard" element={<Dashboard accounts={mockAccounts} transactions={mockTransactions} />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App 