import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ArrowDownLeft, Calendar, DollarSign, Receipt } from 'lucide-react';
import { Menu } from '@headlessui/react';
import TransactionModal from '../components/transactions/TransactionModal';
import { useAuth } from '../contexts/AuthContext';
import plaidService from '../services/plaidService';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'bills_utilities', label: 'Bills & Utilities' },
  { value: 'food_dining', label: 'Food & Dining' },
  { value: 'health_fitness', label: 'Health & Fitness' },
  { value: 'travel', label: 'Travel' },
];

function CategoryTag({ category }) {
  const getTagStyle = (category) => {
    const styles = {
      groceries: 'bg-emerald-50 text-emerald-700',
      transportation: 'bg-blue-50 text-blue-700',
      entertainment: 'bg-purple-50 text-purple-700',
      shopping: 'bg-pink-50 text-pink-700',
      bills_utilities: 'bg-yellow-50 text-yellow-700',
      food_dining: 'bg-orange-50 text-orange-700',
      health_fitness: 'bg-teal-50 text-teal-700',
      travel: 'bg-indigo-50 text-indigo-700',
      default: 'bg-gray-50 text-gray-700'
    };
    return styles[category] || styles.default;
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagStyle(category)}`}>
      {category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
    </span>
  );
}

function FilterDropdown({ options, value, onChange, buttonClassName }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className={`inline-flex justify-between items-center w-full ${buttonClassName}`}>
        {options.find(opt => opt.value === value)?.label || 'Select option'}
        <svg className="w-5 h-5 ml-2 -mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </Menu.Button>
      <Menu.Items className="absolute left-0 right-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 max-h-60 overflow-auto">
        {options.map((option) => (
          <Menu.Item key={option.value}>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-50' : ''
                } w-full text-left px-4 py-2 text-sm text-gray-700`}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [plaidTransactions, setPlaidTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  
  // New filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Plaid transactions when user is authenticated
  useEffect(() => {
    if (!user) {
      setPlaidTransactions([]);
      return;
    }

    const fetchPlaidTransactions = async () => {
      try {
        setIsLoading(true);
        
        const response = await plaidService.getTransactions(null, null, 100); // Get more transactions for filtering
        
        setPlaidTransactions(response.transactions || []);
      } catch (error) {
        // Handle specific error cases
        if (error.response?.status === 400) {
          // No bank account connected - this is expected for new users
          setPlaidTransactions([]);
        } else if (error.response?.status === 401) {
          // Authentication error
          setPlaidTransactions([]);
        } else if (error.response?.status === 403) {
          // Forbidden
          setPlaidTransactions([]);
        } else {
          // Generic error
          setPlaidTransactions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaidTransactions();
  }, [user]);

  // Combine manual and Plaid transactions
  const allTransactions = [...transactions, ...plaidTransactions];

  const handleAddTransaction = (newTransaction) => {
    if (selectedTransaction) {
      // Edit existing transaction
      setTransactions(prevTransactions =>
        prevTransactions.map(t => t.id === selectedTransaction.id ? newTransaction : t)
      );
    } else {
      // Add new transaction
      const transactionWithId = {
        ...newTransaction,
        id: Date.now() // Generate a unique ID
      };
      setTransactions(prevTransactions => [transactionWithId, ...prevTransactions]);
    }
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const filteredTransactions = allTransactions.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
                         (transaction.description || transaction.name || '').toLowerCase().includes(searchLower) ||
                         (transaction.notes || '').toLowerCase().includes(searchLower);
    
    const matchesCategory = selectedCategory === 'all' || 
                           (transaction.category || '').toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesAccount = selectedAccount === 'all' || 
                          transaction.account_id?.toString() === selectedAccount;
    
    const matchesDateRange = (!startDate || transaction.date >= startDate) && 
                            (!endDate || transaction.date <= endDate);
    
    const matchesAmountRange = (!minAmount || Math.abs(transaction.amount) >= parseFloat(minAmount)) && 
                              (!maxAmount || Math.abs(transaction.amount) <= parseFloat(maxAmount));
    
    return matchesSearch && matchesCategory && matchesAccount && matchesDateRange && matchesAmountRange;
  });

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const getAccountOptions = () => {
    // Get unique accounts from transactions
    const accounts = [...new Set(allTransactions.map(t => t.account_id))];
    return [
      { value: 'all', label: 'All Accounts' },
      ...accounts.map(accId => ({ 
        value: accId.toString(), 
        label: `Account ${accId}` 
      }))
    ];
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Track and manage your financial transactions</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 mb-6 w-full">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <FilterDropdown
            options={CATEGORIES}
            value={selectedCategory}
            onChange={setSelectedCategory}
            buttonClassName="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          />

          {/* Account Filter */}
          <FilterDropdown
            options={getAccountOptions()}
            value={selectedAccount}
            onChange={setSelectedAccount}
            buttonClassName="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          />

          {/* Date Range */}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Amount Range */}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <input
              type="number"
              placeholder="Min amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Max amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors sm:col-span-2 lg:col-span-1"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full">
        {isLoading ? (
          <div className="p-4 lg:p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="p-4 lg:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
            <p className="text-gray-600 mb-4">
              Connect your bank account or add manual transactions to start tracking your spending.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Transaction
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-4 lg:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters to see more transactions.
            </p>
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="px-4 lg:px-6 py-4 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                Showing {filteredTransactions.length} of {allTransactions.length} transactions
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="px-4 lg:px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleEditTransaction(transaction)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        transaction.amount < 0 ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <ArrowDownLeft className={`w-5 h-5 ${
                          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {transaction.description || transaction.name || 'Unknown Transaction'}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                          <span className="truncate">{formatDate(transaction.date)}</span>
                          <span>•</span>
                          <span className="truncate">Account {transaction.account_id || 'Unknown'}</span>
                          {transaction.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate">{transaction.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      {transaction.category && (
                        <CategoryTag category={transaction.category} />
                      )}
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.amount < 0 ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSubmit={handleAddTransaction}
        transaction={selectedTransaction}
      />
    </div>
  );
} 