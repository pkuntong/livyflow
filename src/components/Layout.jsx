import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart, User, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
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
          <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
            <LayoutGrid className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link to="/transactions" className={`nav-item ${isActive('/transactions') ? 'active' : ''}`}>
            <Receipt className="w-5 h-5 mr-3" />
            Transactions
          </Link>
          <Link to="/budgets" className={`nav-item ${isActive('/budgets') ? 'active' : ''}`}>
            <PiggyBank className="w-5 h-5 mr-3" />
            Budgets
          </Link>
          <Link to="/accounts" className={`nav-item ${isActive('/accounts') ? 'active' : ''}`}>
            <CreditCard className="w-5 h-5 mr-3" />
            Accounts
          </Link>
          <Link to="/analytics" className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}>
            <LineChart className="w-5 h-5 mr-3" />
            Analytics
          </Link>
        </nav>

        <div className="account-section">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Your Account</p>
              <p className="text-sm text-gray-500">Manage your finances</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
} 