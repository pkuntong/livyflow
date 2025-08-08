import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Receipt, PiggyBank, BarChart3, Settings } from 'lucide-react';

export default function BottomTabBar() {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/app/dashboard' && (location.pathname === '/app' || location.pathname === '/app/dashboard')) {
      return true;
    }
    return location.pathname === path;
  };

  const tabs = [
    {
      path: '/app/dashboard',
      icon: LayoutGrid,
      label: 'Home',
      id: 'dashboard'
    },
    {
      path: '/app/transactions',
      icon: Receipt,
      label: 'Transactions',
      id: 'transactions'
    },
    {
      path: '/app/budgets',
      icon: PiggyBank,
      label: 'Budgets',
      id: 'budgets'
    },
    {
      path: '/app/reports',
      icon: BarChart3,
      label: 'Reports',
      id: 'reports'
    },
    {
      path: '/app/settings',
      icon: Settings,
      label: 'Settings',
      id: 'settings'
    }
  ];

  // Don't show on desktop or if not in app routes
  if (window.innerWidth >= 768 || !location.pathname.startsWith('/app')) {
    return null;
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50 md:hidden"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 touch-target tap-highlight haptic-feedback min-w-0 flex-1 ${
                active 
                  ? 'text-emerald-600 bg-emerald-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              aria-label={`Go to ${tab.label}`}
            >
              <Icon 
                className={`w-5 h-5 mb-1 ${active ? 'text-emerald-600' : 'text-gray-500'}`}
                aria-hidden="true"
              />
              <span className={`text-xs font-medium truncate ${
                active ? 'text-emerald-600' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
              {active && (
                <div 
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-emerald-600 rounded-full"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}