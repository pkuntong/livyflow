import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, PiggyBank, LineChart, Wallet } from 'lucide-react';
import AccountModal from '../components/accounts/AccountModal';
import ConnectBankAccount from '../components/ConnectBankAccount';
import TestPlaidIntegration from '../components/TestPlaidIntegration';
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

const initialAccounts = [
  {
    id: 1,
    name: 'Main Checking',
    institution: 'Chase Bank',
    type: 'CHECKING',
    balance: 5420.50,
    icon: Wallet,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    tag: 'checking'
  },
  {
    id: 2,
    name: 'Emergency Savings',
    institution: 'Chase Bank',
    type: 'SAVINGS',
    balance: 12000.00,
    icon: PiggyBank,
    iconBgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    tag: 'savings'
  },
  {
    id: 3,
    name: 'Chase Freedom',
    institution: 'Chase Bank',
    type: 'CREDIT CARD',
    balance: -1250.30,
    icon: CreditCard,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    tag: 'credit card'
  },
  {
    id: 4,
    name: 'Investment Portfolio',
    institution: 'Fidelity',
    type: 'INVESTMENT',
    balance: 8500.75,
    icon: LineChart,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    tag: 'investment'
  },
  {
    id: 5,
    name: 'Olivia Kuntong',
    institution: 'Chase',
    type: 'CHECKING',
    balance: 20000000.00,
    icon: Wallet,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    tag: 'checking'
  }
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function AccountCard({ account }) {
  const isNegative = account.balance < 0;
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 ${account.iconBgColor} rounded-xl flex items-center justify-center`}>
          <account.icon className={`w-5 h-5 ${account.iconColor}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{account.name}</h2>
            <span className={`text-sm px-3 py-1 rounded-full ${
              account.tag === 'checking' ? 'bg-blue-50 text-blue-700' :
              account.tag === 'savings' ? 'bg-emerald-50 text-emerald-700' :
              account.tag === 'credit card' ? 'bg-red-50 text-red-700' :
              'bg-purple-50 text-purple-700'
            }`}>
              {account.tag}
            </span>
          </div>
          <p className="text-gray-600">{account.institution}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className={`text-2xl font-semibold ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(account.balance)}
          </p>
        </div>
        <p className="text-sm text-gray-600">
          Account Type: {account.type}
        </p>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPlaidConnect, setShowPlaidConnect] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

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

  const handleAddAccount = (newAccount) => {
    const config = ACCOUNT_CONFIGS[newAccount.type];
    const accountWithConfig = {
      ...newAccount,
      ...config,
      tag: config.tag
    };
    setAccounts([...accounts, accountWithConfig]);
  };

  const handlePlaidSuccess = (result, metadata) => {
    console.log("🎉 Accounts: Plaid connection successful!");
    console.log("📊 Full result:", result);
    console.log("🔍 Full metadata:", metadata);
    
    // Add the connected account to the list
    const newAccount = {
      id: Date.now(), // Generate unique ID
      name: metadata.institution?.name || 'Connected Account',
      institution: metadata.institution?.name || 'Unknown Bank',
      type: 'CHECKING', // Default type
      balance: 0, // Will be updated with real data
      icon: Wallet,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      tag: 'checking',
      isPlaidConnected: true,
      accessToken: result.access_token,
      itemId: result.item_id
    };
    
    setAccounts(prev => [...prev, newAccount]);
    setShowPlaidConnect(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600">Manage your financial accounts and track balances</p>
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
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Account
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

      {/* Test Integration Component */}
      <div className="mb-6">
        <TestPlaidIntegration />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>

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

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddAccount}
      />
    </div>
  );
} 