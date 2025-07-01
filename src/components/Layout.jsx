import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart, User, LogOut, Settings, BarChart3, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import ToastContainer from './ToastContainer';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-full md:w-64 lg:w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 md:hidden border-b border-gray-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-900">LivyFlow</span>
          </Link>
          <button
            onClick={closeSidebar}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop logo */}
        <Link to="/" className="hidden md:flex items-center gap-3 p-6 border-b border-gray-200">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <PiggyBank className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">LivyFlow</h1>
            <p className="text-sm text-gray-500">Personal Finance</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-4 lg:p-6">
          <div className="space-y-2">
            <Link to="/app/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/dashboard') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <LayoutGrid className="w-5 h-5" />
              Dashboard
            </Link>
            <Link to="/app/transactions" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/transactions') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <Receipt className="w-5 h-5" />
              Transactions
            </Link>
            <Link to="/app/budgets" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/budgets') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <PiggyBank className="w-5 h-5" />
              Budgets
            </Link>
            <Link to="/app/reports" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/reports') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <BarChart3 className="w-5 h-5" />
              Reports
            </Link>
            <Link to="/app/accounts" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/accounts') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <CreditCard className="w-5 h-5" />
              Accounts
            </Link>
            <Link to="/app/analytics" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/analytics') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <LineChart className="w-5 h-5" />
              Analytics
            </Link>
            <Link to="/app/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/app/settings') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} onClick={closeSidebar}>
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>
        </nav>

        {/* Account section */}
        <div className="p-4 lg:p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">Your Account</p>
              <p className="text-sm text-gray-500 truncate">{currentUser?.displayName || 'User'}</p>
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
      <main className="flex-1 flex flex-col min-h-screen w-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
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
            </div>
            <div className="flex items-center space-x-4">
              <Notifications />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 mx-auto max-w-screen-lg w-full px-4 py-4 lg:px-6 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
} 