import React, { useState, useEffect } from 'react';
import { CreditCard, PiggyBank, LineChart, Wallet, RefreshCw, ChevronDown, ChevronUp, Receipt, Calendar } from 'lucide-react';
import ConnectBankAccount from '../components/ConnectBankAccount';
import { useAuth } from '../contexts/AuthContext';
import plaidService from '../services/plaidService';

const ACCOUNT_CONFIGS = {
  'CHECKING': {
    icon: Wallet,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    tag: 'checking'
  },
  'SAVINGS': {
    icon: PiggyBank,
    iconBgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    tag: 'savings'
  },
  'CREDIT CARD': {
    icon: CreditCard,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    tag: 'credit card'
  },
  'INVESTMENT': {
    icon: LineChart,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    tag: 'investment'
  }
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function AccountCard({ account }) {
  const { user } = useAuth();
  const [showTransactions, setShowTransactions] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const isNegative = account.balance < 0;

  const fetchRecentTransactions = async () => {
    if (!user || !account.accountId || !account.isPlaidConnected) {
      return;
    }

    try {
      setLoadingTransactions(true);
      
      // Fetch transactions for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await plaidService.getTransactions(startDateStr, endDateStr, 100);
      const allTransactions = response.transactions || [];

      // Filter transactions for this specific account
      const accountTransactions = allTransactions.filter(transaction => 
        transaction.account_id === account.accountId
      ).slice(0, 5); // Get only the 5 most recent

      setRecentTransactions(accountTransactions);
    } catch (error) {
      console.error("❌ Error fetching recent transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleToggleTransactions = () => {
    if (!showTransactions && account.isPlaidConnected) {
      fetchRecentTransactions();
    }
    setShowTransactions(!showTransactions);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getAccountTypeDisplay = (type, subtype) => {
    if (type === 'credit') return 'Credit Card';
    if (type === 'depository') {
      if (subtype === 'checking') return 'Checking';
      if (subtype === 'savings') return 'Savings';
      return 'Depository';
    }
    if (type === 'loan') return 'Loan';
    if (type === 'investment') return 'Investment';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getAccountIcon = (type, subtype) => {
    if (type === 'credit') return CreditCard;
    if (type === 'depository') {
      if (subtype === 'checking') return Wallet;
      if (subtype === 'savings') return PiggyBank;
      return Wallet;
    }
    if (type === 'investment') return LineChart;
    return Wallet;
  };

  const getAccountIconConfig = (type, subtype) => {
    if (type === 'credit') {
      return { bgColor: 'bg-red-100', color: 'text-red-600' };
    }
    if (type === 'depository') {
      if (subtype === 'checking') {
        return { bgColor: 'bg-blue-100', color: 'text-blue-600' };
      }
      if (subtype === 'savings') {
        return { bgColor: 'bg-emerald-100', color: 'text-emerald-600' };
      }
      return { bgColor: 'bg-blue-100', color: 'text-blue-600' };
    }
    if (type === 'investment') {
      return { bgColor: 'bg-purple-100', color: 'text-purple-600' };
    }
    return { bgColor: 'bg-gray-100', color: 'text-gray-600' };
  };

  const IconComponent = getAccountIcon(account.type, account.subtype);
  const iconConfig = getAccountIconConfig(account.type, account.subtype);
  const accountTypeDisplay = getAccountTypeDisplay(account.type, account.subtype);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 ${iconConfig.bgColor} rounded-xl flex items-center justify-center`}>
            <IconComponent className={`w-6 h-6 ${iconConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{account.name}</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${
                account.type === 'credit' ? 'bg-red-50 text-red-700' :
                account.subtype === 'checking' ? 'bg-blue-50 text-blue-700' :
                account.subtype === 'savings' ? 'bg-emerald-50 text-emerald-700' :
                account.type === 'investment' ? 'bg-purple-50 text-purple-700' :
                'bg-gray-50 text-gray-700'
              }`}>
                {accountTypeDisplay}
              </span>
            </div>
            <p className="text-sm text-gray-600">{account.institution}</p>
            {account.mask && (
              <p className="text-xs text-gray-500">•••• {account.mask}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Current Balance</p>
            <p className={`text-2xl font-semibold ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(account.balance)}
            </p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Account Type: {accountTypeDisplay}</span>
            {account.isPlaidConnected && (
              <span className="text-green-600 font-medium">Connected</span>
            )}
          </div>
        </div>

        {/* Recent Transactions Toggle */}
        {account.isPlaidConnected && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleToggleTransactions}
              className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Recent Transactions
              </span>
              {showTransactions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Recent Transactions Section */}
      {showTransactions && account.isPlaidConnected && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {loadingTransactions ? (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading transactions...
              </div>
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="space-y-3 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Last 5 Transactions</h4>
              {recentTransactions.map((transaction, index) => (
                <div key={transaction.transaction_id || index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.name || transaction.merchant_name || 'Unknown Transaction'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No recent transactions</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  // const [accounts, setAccounts] = useState([]);
  const [plaidAccounts, setPlaidAccounts] = useState([]);
  const [showPlaidConnect, setShowPlaidConnect] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidAccountsLoading, setPlaidAccountsLoading] = useState(false);
  const [plaidAccountsError, setPlaidAccountsError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const totalBalance = plaidAccounts.reduce((sum, account) => sum + account.balance, 0);

  // Fetch Plaid accounts when user is authenticated
  useEffect(() => {
    if (!user) {
      console.log("🔒 User not authenticated, skipping Plaid accounts fetch");
      setPlaidAccounts([]);
      return;
    }

    // Only fetch accounts if we have a link token (indicating Plaid is set up)
    if (linkToken) {
      fetchPlaidAccounts();
    } else {
      console.log("💡 No link token available yet, skipping accounts fetch");
    }
  }, [user, linkToken]);

  // Test Plaid link token fetch on component mount only if user is signed in
  useEffect(() => {
    if (!user) {
      console.log("🔒 User not signed in, skipping Plaid link token fetch");
      return;
    }

    console.log("🔁 useEffect: User signed in, attempting to fetch Plaid link token");
    console.log("👤 User:", user.email);
    setPlaidLoading(true);
    
    plaidService.getLinkToken()
      .then(response => {
        console.log("✅ Link token response:", response);
        console.log("📦 Full response data:", response);
        setLinkToken(response);
      })
      .catch(error => {
        console.error("❌ Error fetching link token:", error);
        console.error("❌ Error response data:", error.response?.data);
        console.error("❌ Error status:", error.response?.status);
        console.error("❌ Error message:", error.message);
        
        // Handle 403 Forbidden error - user not authenticated
        if (error.response?.status === 403) {
          console.log("🚫 403 Forbidden - User not authenticated");
          // You can redirect to sign in page here if needed
          // window.location.href = '/login';
        }
      })
      .finally(() => {
        setPlaidLoading(false);
      });
  }, [user]);

  const handlePlaidSuccess = (result, metadata) => {
    console.log("✅ Plaid connection successful:", result);
    console.log("📋 Metadata:", metadata);
    
    // Refresh accounts after successful connection
    fetchPlaidAccounts();
    setShowPlaidConnect(false);
  };

  // Function to fetch Plaid accounts
  const fetchPlaidAccounts = async () => {
    try {
      setPlaidAccountsLoading(true);
      setPlaidAccountsError(null);
      console.log("🔄 Fetching Plaid accounts...");
      
      const response = await plaidService.getAccounts();
      console.log("✅ Plaid accounts fetched:", response);
      
      // Transform Plaid accounts to match our account format
      const transformedAccounts = response.accounts.map((account, index) => {
        const accountType = account.type?.toUpperCase() || 'CHECKING';
        const config = ACCOUNT_CONFIGS[accountType] || ACCOUNT_CONFIGS['CHECKING'];
        
        return {
          id: `plaid-${account.account_id}`,
          name: account.name,
          institution: 'Connected Bank',
          type: account.type || 'depository',
          subtype: account.subtype || 'checking',
          balance: account.balances.current || 0,
          icon: config.icon,
          iconBgColor: config.iconBgColor,
          iconColor: config.iconColor,
          tag: config.tag,
          isPlaidConnected: true,
          accountId: account.account_id,
          mask: account.mask,
          accountNumber: account.account_id
        };
      });
      
      setPlaidAccounts(transformedAccounts);
      console.log("✅ Transformed Plaid accounts:", transformedAccounts);
    } catch (error) {
      console.error("❌ Error fetching Plaid accounts:", error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        // No bank account connected - this is expected for new users
        console.log("💡 No bank account connected yet - this is normal for new users");
        setPlaidAccountsError(null); // Don't show error for expected state
        setPlaidAccounts([]);
      } else if (error.response?.status === 401) {
        // Authentication error
        setPlaidAccountsError("Authentication failed. Please sign in again.");
        setPlaidAccounts([]);
      } else if (error.response?.status === 403) {
        // Forbidden
        setPlaidAccountsError("Access denied. Please check your permissions.");
        setPlaidAccounts([]);
      } else {
        // Generic error
        setPlaidAccountsError(error.message || "Failed to fetch bank accounts");
        setPlaidAccounts([]);
      }
    } finally {
      setPlaidAccountsLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user) {
      console.log("🔒 User not authenticated, cannot refresh");
      return;
    }

    setIsRefreshing(true);
    try {
      console.log("🔄 Manual refresh started...");
      await fetchPlaidAccounts();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600">Manage your connected bank accounts and track balances</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Balance</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPlaidConnect(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <CreditCard className="w-5 h-5" />
              Connect Bank
            </button>
          </div>
        </div>
      </div>

      {/* Plaid Connection Status */}
      {plaidLoading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">🔄 Testing Plaid connection...</p>
        </div>
      )}

      {linkToken && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">✅ Plaid connection ready! Link token: {linkToken.substring(0, 20)}...</p>
        </div>
      )}

      {/* Plaid Accounts Section */}
      {user && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Bank Accounts</h2>
            <div className="flex items-center gap-2">
              {plaidAccountsLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading accounts...
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || plaidAccountsLoading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {plaidAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {plaidAccounts.map(account => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          ) : !plaidAccountsLoading && !plaidAccountsError && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="mb-4">
                <CreditCard className="w-12 h-12 text-blue-500 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Connect Your Bank Account</h3>
              <p className="text-blue-700 mb-4">Connect your bank account to see your real-time balances and transactions.</p>
              <button
                onClick={() => setShowPlaidConnect(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Connect Bank Account
              </button>
            </div>
          )}
          
          {plaidAccountsError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-red-500 mt-0.5" />
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-medium mb-1">Connection Required</p>
                  <p className="text-red-700 text-sm mb-3">{plaidAccountsError}</p>
                  <button
                    onClick={() => setShowPlaidConnect(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    Connect Bank Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plaid Connect Modal */}
      {showPlaidConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Connect Bank Account</h2>
            <ConnectBankAccount 
              onSuccess={handlePlaidSuccess}
              onExit={() => setShowPlaidConnect(false)}
            />
            <button 
              onClick={() => setShowPlaidConnect(false)}
              className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 