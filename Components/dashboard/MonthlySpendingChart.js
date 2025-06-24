import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import plaidService from '../../src/services/plaidService';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

export default function MonthlySpendingChart() {
  const { user } = useAuth();
  const [spendingData, setSpendingData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'pie'
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMonthlySpending();
    }
  }, [user]);

  const fetchMonthlySpending = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range for past 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log("📅 Fetching transactions from", startDateStr, "to", endDateStr);

      // Fetch transactions from the past 30 days
      const response = await plaidService.getTransactions(startDateStr, endDateStr, 500);
      const transactions = response.transactions || [];

      console.log("✅ Fetched", transactions.length, "transactions");

      // Process transactions and group by category
      const categorySpending = {};

      transactions.forEach(transaction => {
        // Only include negative amounts (spending)
        if (transaction.amount < 0) {
          let category = 'Other';
          
          // Extract category from transaction
          if (transaction.category && Array.isArray(transaction.category) && transaction.category.length > 0) {
            category = transaction.category[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          } else if (transaction.category && typeof transaction.category === 'string') {
            category = transaction.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          } else if (transaction.personal_finance_category && transaction.personal_finance_category.primary) {
            category = transaction.personal_finance_category.primary.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }

          const amount = Math.abs(transaction.amount);
          
          if (categorySpending[category]) {
            categorySpending[category] += amount;
          } else {
            categorySpending[category] = amount;
          }
        }
      });

      // Convert to chart data format
      const chartData = Object.entries(categorySpending)
        .map(([category, amount]) => ({
          category,
          amount: parseFloat(amount.toFixed(2)),
          percentage: 0 // Will be calculated below
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Show top 10 categories

      // Calculate percentages
      const totalSpending = chartData.reduce((sum, item) => sum + item.amount, 0);
      chartData.forEach(item => {
        item.percentage = totalSpending > 0 ? ((item.amount / totalSpending) * 100).toFixed(1) : 0;
      });

      console.log("📊 Processed spending data:", chartData);
      setSpendingData(chartData);

    } catch (error) {
      console.error("❌ Error fetching monthly spending:", error);
      
      if (error.response?.status === 400) {
        setError("No bank account connected. Connect your bank account to see spending data.");
      } else {
        setError("Failed to load spending data. Please try again.");
      }
    } finally {
      setIsLoading(false);
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
      await fetchMonthlySpending();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.category}</p>
          <p className="text-blue-600 font-medium">{formatCurrency(data.amount)}</p>
          <p className="text-gray-600 text-sm">{data.percentage}% of total spending</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Spending Summary</h2>
          <p className="text-sm text-gray-600 mt-1">Past 30 days breakdown</p>
        </div>
        <div className="p-6 flex items-center justify-center h-[300px]">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            Loading spending data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Spending Summary</h2>
          <p className="text-sm text-gray-600 mt-1">Past 30 days breakdown</p>
        </div>
        <div className="p-6 flex items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (spendingData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Spending Summary</h2>
          <p className="text-sm text-gray-600 mt-1">Past 30 days breakdown</p>
        </div>
        <div className="p-6 flex items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p>No spending data for the past 30 days</p>
            <p className="text-sm mt-1">Connect your bank account or add transactions to see spending breakdown</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Monthly Spending Summary</h2>
            <p className="text-sm text-gray-600 mt-1">Past 30 days breakdown</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                chartType === 'bar' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                chartType === 'pie' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pie
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={spendingData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={spendingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {spendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Spending</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(spendingData.reduce((sum, item) => sum + item.amount, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Top Category</p>
              <p className="font-semibold text-gray-900">
                {spendingData[0]?.category || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 