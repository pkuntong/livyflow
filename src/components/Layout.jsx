import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, CreditCard, LineChart, User, LogOut, Settings, BarChart3, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import ToastContainer from './ToastContainer';
import { TouchGestureHandler } from '../utils/touchGestures';
import BottomTabBar from './BottomTabBar';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  
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

  // Handle escape key to close sidebar
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
    };

    if (sidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [sidebarOpen]);

  const getPageTitle = () => {
    const pageMap = {
      '/app/dashboard': 'Dashboard',
      '/app/transactions': 'Transactions', 
      '/app/budgets': 'Budgets',
      '/app/reports': 'Reports',
      '/app/accounts': 'Accounts',
      '/app/analytics': 'Analytics',
      '/app/settings': 'Settings'
    };
    return pageMap[location.pathname] || 'Dashboard';
  };

  // Add swipe gestures for mobile navigation
  useEffect(() => {
    if (mainRef.current && window.innerWidth < 768) {
      const gestureHandler = new TouchGestureHandler(mainRef.current, {
        swipeleft: () => {
          if (sidebarOpen) {
            setSidebarOpen(false);
          }
        },
        swiperight: () => {
          if (!sidebarOpen) {
            setSidebarOpen(true);
          }
        },
        threshold: 50,
        preventScroll: false
      });

      return () => gestureHandler.destroy();
    }
  }, [sidebarOpen]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 overflow-x-hidden safe-top safe-bottom" style={{ backgroundColor: '#f8fafc' }}>
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Skip to main content link */}
      <a 
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <aside 
        ref={sidebarRef}
        className={`fixed md:relative inset-y-0 left-0 z-50 w-full sm:w-80 md:w-64 lg:w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} safe-left`}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 md:hidden border-b border-gray-200">
          <Link to="/" className="flex items-center gap-3" aria-label="Go to LivyFlow homepage">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center" aria-hidden="true">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-900">LivyFlow</span>
          </Link>
          <button
            onClick={closeSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop logo */}
        <Link to="/" className="hidden md:flex items-center gap-3 p-6 border-b border-gray-200" aria-label="Go to LivyFlow homepage">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center" aria-hidden="true">
            <PiggyBank className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">LivyFlow</h1>
            <p className="text-sm text-gray-500">Personal Finance</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-4 lg:p-6" aria-label="Main menu">
          <ul className="space-y-2" role="list">
            <li>
              <Link 
                to="/app/dashboard" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/dashboard') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/dashboard') ? 'page' : undefined}
              >
                <LayoutGrid className="w-5 h-5" aria-hidden="true" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/app/transactions" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/transactions') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/transactions') ? 'page' : undefined}
              >
                <Receipt className="w-5 h-5" aria-hidden="true" />
                Transactions
              </Link>
            </li>
            <li>
              <Link 
                to="/app/budgets" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/budgets') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/budgets') ? 'page' : undefined}
              >
                <PiggyBank className="w-5 h-5" aria-hidden="true" />
                Budgets
              </Link>
            </li>
            <li>
              <Link 
                to="/app/reports" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/reports') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/reports') ? 'page' : undefined}
              >
                <BarChart3 className="w-5 h-5" aria-hidden="true" />
                Reports
              </Link>
            </li>
            <li>
              <Link 
                to="/app/accounts" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/accounts') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/accounts') ? 'page' : undefined}
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                Accounts
              </Link>
            </li>
            <li>
              <Link 
                to="/app/analytics" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/analytics') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/analytics') ? 'page' : undefined}
              >
                <LineChart className="w-5 h-5" aria-hidden="true" />
                Analytics
              </Link>
            </li>
            <li>
              <Link 
                to="/app/settings" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isActive('/app/settings') ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                onClick={closeSidebar}
                aria-current={isActive('/app/settings') ? 'page' : undefined}
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* Account section */}
        <div className="p-4 lg:p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center" aria-hidden="true">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">Your Account</p>
              <p className="text-sm text-gray-500 truncate">{currentUser?.displayName || 'User'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Sign out of your account"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 flex flex-col min-h-screen w-full safe-right" role="main">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6 safe-top" role="banner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 touch-target tap-highlight haptic-feedback"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Notifications />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div id="main-content" className="flex-1 mx-auto max-w-screen-lg w-full px-4 py-4 lg:px-6 lg:py-6 custom-scrollbar smooth-scroll prevent-overscroll pb-20 md:pb-4" style={{ backgroundColor: '#f8fafc' }}>
          <Outlet />
        </div>
      </main>
      
      {/* Bottom Tab Bar for Mobile */}
      <BottomTabBar />
    </div>
  );
} 