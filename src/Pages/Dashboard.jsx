import React, { useState, useEffect, useRef } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import FinancialOverview from '../../Components/dashboard/FinancialOverview.js';
import MonthlySpendingChart from '../../Components/dashboard/MonthlySpendingChart.js';
import SpendingTrendChart from '../../Components/dashboard/SpendingTrendChart.js';
import SpendingTrendsChart from '../components/dashboard/SpendingTrendsChart.jsx';
import MonthlyInsightsPanel from '../components/dashboard/MonthlyInsightsPanel.jsx';
import Alerts from '../components/Alerts.jsx';
import Export from '../components/Export.jsx';
import Insights from '../components/Insights.jsx';
import RecurringSubscriptions from '../components/RecurringSubscriptions.jsx';
import { useAuth } from '../contexts/AuthContext';
import plaidService from '../services/plaidService';
import { createNotification } from '../services/notificationService';
import { PullToRefresh } from '../utils/touchGestures';

export default function Dashboard({ accounts = [], transactions = [] }) {
  const { user } = useAuth();
  const [plaidTransactions, setPlaidTransactions] = useState([]);
  const [plaidTransactionsLoading, setPlaidTransactionsLoading] = useState(false);
  const [plaidTransactionsError, setPlaidTransactionsError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const dashboardRef = useRef(null);

  // Fetch Plaid transactions when user is authenticated
  useEffect(() => {
    if (!user) {
      setPlaidTransactions([]);
      return;
    }

    fetchPlaidTransactions();
  }, [user]);

  // Show welcome notification on first visit
  useEffect(() => {
    if (user && !hasShownWelcome) {
      const showWelcome = async () => {
        try {
          await createNotification({
            title: "Welcome to LivyFlow! 🎉",
            message: "Your financial journey starts here. We'll help you track spending, set budgets, and achieve your financial goals.",
            type: "success"
          });
          setHasShownWelcome(true);
        } catch (error) {
          // Silent error handling for welcome notification
        }
      };
      
      showWelcome();
    }
  }, [user, hasShownWelcome]);

  // Combine manual transactions with Plaid transactions
  const allTransactions = [...(Array.isArray(transactions) ? transactions : []), ...plaidTransactions];

  // Get Plaid accounts from the Accounts page context or fetch them here
  // For now, we'll use the accounts prop and let the Accounts page handle Plaid accounts separately

  // Function to fetch Plaid transactions
  const fetchPlaidTransactions = async () => {
    try {
      setPlaidTransactionsLoading(true);
      setPlaidTransactionsError(null);
      const response = await plaidService.getTransactions(null, null, 500); // Get more transactions for better data
      
      setPlaidTransactions(response.transactions || []);
    } catch (error) {
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        // No bank account connected - this is expected for new users
        setPlaidTransactionsError("No bank account connected. Connect your bank account to see transactions.");
        setPlaidTransactions([]);
      } else if (error.response?.status === 401) {
        // Authentication error
        setPlaidTransactionsError("Authentication failed. Please sign in again.");
        setPlaidTransactions([]);
      } else if (error.response?.status === 403) {
        // Forbidden
        setPlaidTransactionsError("Access denied. Please check your permissions.");
        setPlaidTransactions([]);
      } else {
        // Generic error
        setPlaidTransactionsError(error.message || "Failed to fetch transactions");
        setPlaidTransactions([]);
      }
    } finally {
      setPlaidTransactionsLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user) {
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchPlaidTransactions();
    } catch (error) {
      // Silent error handling for manual refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  // Setup pull-to-refresh
  useEffect(() => {
    if (dashboardRef.current && user) {
      const pullToRefresh = new PullToRefresh(dashboardRef.current, {
        refreshCallback: handleRefresh,
        threshold: 60
      });
      
      return () => {
        if (pullToRefresh.destroy) {
          pullToRefresh.destroy();
        }
      };
    }
  }, [user]);

  return (
    <div ref={dashboardRef} className="w-full prevent-overscroll">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome back! Here's your financial overview.</p>
      </div>

      {/* Financial Alerts */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <Alerts />
      </div>

      {/* Financial Overview Cards */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <FinancialOverview accounts={accounts} transactions={allTransactions} />
      </div>

      {/* AI Insights */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <Insights />
      </div>

      {/* Monthly Insights Panel */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <MonthlyInsightsPanel />
      </div>

      {/* Additional Dashboard Components - Stack vertically on mobile, horizontal on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 w-full">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || plaidTransactionsLoading}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-target tap-highlight haptic-feedback"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-target tap-highlight haptic-feedback">
                + Add
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {plaidTransactionsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading transactions...
                </div>
              </div>
            )}
            
            {plaidTransactionsError && (
              <div className={`p-4 border rounded-lg mb-4 ${
                plaidTransactionsError.includes("No bank account connected") 
                  ? "bg-blue-50 border-blue-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <p className={`text-sm ${
                  plaidTransactionsError.includes("No bank account connected") 
                    ? "text-blue-800" 
                    : "text-red-800"
                }`}>
                  {plaidTransactionsError.includes("No bank account connected") 
                    ? "💡 " + plaidTransactionsError 
                    : "❌ " + plaidTransactionsError}
                </p>
              </div>
            )}
            
            <div className="space-y-4 sm:space-y-6">
              {allTransactions.length > 0 ? (
                allTransactions.map((transaction, index) => (
                  <div key={transaction.id || transaction.transaction_id || index} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {transaction.name || transaction.description || transaction.merchant_name || 'Unknown Transaction'}
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          {transaction.category && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              {Array.isArray(transaction.category) 
                                ? transaction.category[0]?.replace(/_/g, ' ') 
                                : transaction.category.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm text-gray-500 truncate">
                            {transaction.isPlaidConnected ? 'Connected Account' : 'Unknown Account'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2 sm:ml-4">
                      <p className={`font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {transaction.date ? new Date(transaction.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        }) : 'Unknown Date'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No transactions found</p>
                  <p className="text-sm mt-1">Add some transactions or connect your bank account to see activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recurring Subscriptions */}
        <div className="w-full">
          <RecurringSubscriptions />
        </div>

        {/* Monthly Spending Summary Chart */}
        <div className="w-full">
          <MonthlySpendingChart />
        </div>
      </div>

      {/* Second Row - Full Width Components - Stack vertically on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        {/* Spending Trend Over Time Chart */}
        <div className="w-full">
          <SpendingTrendChart />
        </div>
        
        {/* Placeholder for future component */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 w-full">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 sm:p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors touch-target tap-highlight haptic-feedback">
              <div className="font-medium text-gray-900 text-sm sm:text-base">📊 View Analytics</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Detailed spending analysis</div>
            </button>
            <button className="w-full text-left p-3 sm:p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors touch-target tap-highlight haptic-feedback">
              <div className="font-medium text-gray-900 text-sm sm:text-base">🎯 Set Budget Goals</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Create and track budgets</div>
            </button>
            <button className="w-full text-left p-3 sm:p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors touch-target tap-highlight haptic-feedback">
              <div className="font-medium text-gray-900 text-sm sm:text-base">📈 Track Progress</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Monitor financial goals</div>
            </button>
          </div>
        </div>
      </div>

      {/* Spending Trends Chart - Full Width */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <SpendingTrendsChart />
      </div>

      {/* Export Section */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <Export />
      </div>
    </div>
  );
} 