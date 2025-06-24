import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart, User, LogOut, Settings, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import ToastContainer from './ToastContainer';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <PiggyBank className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">LivyFlow</h1>
            <p className="text-sm text-gray-500">Personal Finance</p>
          </div>
        </div>

        <nav className="mt-8">
          <Link to="/app/dashboard" className={`nav-item ${isActive('/app/dashboard') ? 'active' : ''}`}>
            <LayoutGrid className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link to="/app/transactions" className={`nav-item ${isActive('/app/transactions') ? 'active' : ''}`}>
            <Receipt className="w-5 h-5 mr-3" />
            Transactions
          </Link>
          <Link to="/app/budgets" className={`nav-item ${isActive('/app/budgets') ? 'active' : ''}`}>
            <PiggyBank className="w-5 h-5 mr-3" />
            Budgets
          </Link>
          <Link to="/app/reports" className={`nav-item ${isActive('/app/reports') ? 'active' : ''}`}>
            <BarChart3 className="w-5 h-5 mr-3" />
            Reports
          </Link>
          <Link to="/app/accounts" className={`nav-item ${isActive('/app/accounts') ? 'active' : ''}`}>
            <CreditCard className="w-5 h-5 mr-3" />
            Accounts
          </Link>
          <Link to="/app/analytics" className={`nav-item ${isActive('/app/analytics') ? 'active' : ''}`}>
            <LineChart className="w-5 h-5 mr-3" />
            Analytics
          </Link>
          <Link to="/app/settings" className={`nav-item ${isActive('/app/settings') ? 'active' : ''}`}>
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Link>
        </nav>

        <div className="account-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Your Account</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-1">
        {/* Header with Notifications */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {location.pathname === '/app/dashboard' && 'Dashboard'}
                {location.pathname === '/app/transactions' && 'Transactions'}
                {location.pathname === '/app/budgets' && 'Budgets'}
                {location.pathname === '/app/reports' && 'Reports'}
                {location.pathname === '/app/accounts' && 'Accounts'}
                {location.pathname === '/app/analytics' && 'Analytics'}
                {location.pathname === '/app/settings' && 'Settings'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <Notifications />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
} 