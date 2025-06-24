import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ArrowDownLeft, Calendar, DollarSign } from 'lucide-react';
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

const mockAccounts = [
  { id: 1, name: 'Main Checking', balance: 5420.50 },
  { id: 2, name: 'Emergency Savings', balance: 12000.00 },
  { id: 3, name: 'Chase Freedom', balance: -1250.30 },
];

const initialTransactions = [
  {
    id: 1,
    description: 'Whole Foods',
    amount: -125.50,
    category: 'groceries',
    account_id: 1,
    date: '2024-12-14',
    notes: 'Weekly groceries'
  },
  {
    id: 2,
    description: 'Uber Ride',
    amount: -18.75,
    category: 'transportation',
    account_id: 1,
    date: '2024-12-13',
    notes: 'To downtown'
  },
  {
    id: 3,
    description: 'Netflix Subscription',
    amount: -15.99,
    category: 'entertainment',
    account_id: 1,
    date: '2024-12-12',
    notes: 'Monthly subscription'
  }
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
      <Menu.Button className={`inline-flex justify-between items-center w-48 ${buttonClassName}`}>
        {options.find(opt => opt.value === value)?.label || 'Select option'}
        <svg className="w-5 h-5 ml-2 -mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
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
  const [transactions, setTransactions] = useState(initialTransactions);
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
      console.log("🔒 User not authenticated, skipping Plaid transactions fetch");
      setPlaidTransactions([]);
      return;
    }

    const fetchPlaidTransactions = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 Fetching Plaid transactions...");
        
        const response = await plaidService.getTransactions(null, null, 100); // Get more transactions for filtering
        console.log("✅ Plaid transactions fetched:", response);
        
        setPlaidTransactions(response.transactions || []);
      } catch (error) {
        console.error("❌ Error fetching Plaid transactions:", error);
        
        // Handle specific error cases
        if (error.response?.status === 400) {
          // No bank account connected - this is expected for new users
          console.log("💡 No bank account connected yet - this is normal for new users");
          setPlaidTransactions([]);
        } else if (error.response?.status === 401) {
          // Authentication error
          console.error("❌ Authentication failed");
          setPlaidTransactions([]);
        } else if (error.response?.status === 403) {
          // Forbidden
          console.error("❌ Access denied");
          setPlaidTransactions([]);
        } else {
          // Generic error
          console.error("❌ Failed to fetch transactions:", error.message);
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
                           transaction.category === selectedCategory ||
                           (Array.isArray(transaction.category) && transaction.category.includes(selectedCategory));
    
    const matchesAccount = selectedAccount === 'all' || 
                          transaction.account_id?.toString() === selectedAccount;
    
    // Date range filter
    const transactionDate = new Date(transaction.date);
    const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
    const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
    
    // Amount range filter
    const amount = Math.abs(transaction.amount);
    const matchesMinAmount = !minAmount || amount >= parseFloat(minAmount);
    const matchesMaxAmount = !maxAmount || amount <= parseFloat(maxAmount);
    
    return matchesSearch && matchesCategory && matchesAccount && 
           matchesStartDate && matchesEndDate && 
           matchesMinAmount && matchesMaxAmount;
  });

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
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

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedAccount !== 'all' || 
                          startDate || endDate || minAmount || maxAmount;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Track and manage all your financial transactions</p>
        </div>
        <button 
          onClick={() => {
            setSelectedTransaction(null);
            setIsModalOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Category Filter */}
            <FilterDropdown
              options={CATEGORIES}
              value={selectedCategory}
              onChange={setSelectedCategory}
              buttonClassName="w-full px-4 py-2 border border-emerald-500 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
            />

            {/* Account Filter */}
            <FilterDropdown
              options={[
                { value: 'all', label: 'All Accounts' },
                ...mockAccounts.map(acc => ({ value: acc.id.toString(), label: acc.name }))
              ]}
              value={selectedAccount}
              onChange={setSelectedAccount}
              buttonClassName="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            />

            {/* Start Date */}
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                placeholder="Start date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                placeholder="End date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Min Amount */}
            <div className="relative">
              <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                placeholder="Min amount"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                step="0.01"
                min="0"
              />
            </div>

            {/* Max Amount */}
            <div className="relative">
              <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                placeholder="Max amount"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading transactions...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            All Transactions ({filteredTransactions.length})
          </h2>

          <div className="space-y-6">
            {filteredTransactions.map(transaction => (
              <div
                key={transaction.id || transaction.transaction_id}
                onClick={() => handleEditTransaction(transaction)}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ArrowDownLeft className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {transaction.description || transaction.name || transaction.merchant_name || 'Unknown Transaction'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {transaction.category && (
                          <CategoryTag category={Array.isArray(transaction.category) ? transaction.category[0] : transaction.category} />
                        )}
                        <span className="text-gray-600">
                          {transaction.isPlaidConnected ? 'Connected Account' : 
                           mockAccounts.find(acc => acc.id === transaction.account_id)?.name || 'Unknown Account'}
                        </span>
                        <span className="text-gray-600">{formatDate(transaction.date)}</span>
                      </div>
                      {transaction.notes && (
                        <p className="text-gray-600 mt-2">{transaction.notes}</p>
                      )}
                    </div>
                    <p className={`text-lg font-semibold whitespace-nowrap ${
                      transaction.amount < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTransactions.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                {hasActiveFilters ? 'No transactions found matching your filters' : 'No transactions found'}
              </div>
            )}
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSave={handleAddTransaction}
        accounts={mockAccounts}
        transaction={selectedTransaction}
      />
    </div>
  );
} 