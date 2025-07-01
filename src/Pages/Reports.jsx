import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, RefreshCw, Loader2, Calendar, Clock, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import reportsService from '../services/reportsService';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'monthly') {
        const data = await reportsService.getMonthlyReport();
        setMonthlyData(data);
      } else if (activeTab === 'weekly') {
        const data = await reportsService.getWeeklyReport();
        setWeeklyData(data);
      } else if (activeTab === 'categories') {
        const data = await reportsService.getCategoryReport();
        setCategoryData(data);
      }
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      setError(error.response?.data?.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Food and Drink': '🍔',
      'Shopping': '🛒',
      'Transportation': '🚗',
      'Entertainment': '🎬',
      'Bills and Utilities': '💡',
      'Health and Fitness': '💪',
      'Travel': '✈️',
      'Education': '📚',
      'Personal Care': '💄',
      'Home and Garden': '🏠',
      'Business': '💼',
      'Other': '📦'
    };
    return icons[category] || '📦';
  };

  const getCategoryColor = (index) => {
    return COLORS[index % COLORS.length];
  };

  const renderMonthlyReport = () => {
    if (!monthlyData) return null;

    const chartData = monthlyData.categories.map((cat, index) => ({
      name: cat.category,
      value: cat.amount,
      percentage: cat.percentage,
      color: getCategoryColor(index)
    }));

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monthly Spending</h3>
                <p className="text-sm text-gray-600">{monthlyData.month}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${monthlyData.total_spent.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          {monthlyData.categories.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {monthlyData.categories.map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                        {getCategoryIcon(cat.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{cat.category}</p>
                        <p className="text-sm text-gray-600">{cat.percentage}% of total</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-gray-900">${cat.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No spending data available for this month</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeeklyReport = () => {
    if (!weeklyData) return null;

    const chartData = weeklyData.daily_spending.map((day, index) => ({
      name: day.day,
      amount: day.amount,
      date: day.date
    }));

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Weekly Spending</h3>
                <p className="text-sm text-gray-600">{weeklyData.period}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${weeklyData.total_spent.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Spending Trend</h3>
          {weeklyData.daily_spending.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No spending data available for this week</p>
            </div>
          )}
        </div>

        {/* Daily Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {weeklyData.daily_spending.map((day) => (
              <div key={day.date} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{day.day}</p>
                    <p className="text-sm text-gray-600 truncate">{day.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-lg font-semibold text-gray-900">${day.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryReport = () => {
    if (!categoryData) return null;

    const chartData = categoryData.categories.slice(0, 10).map((cat, index) => ({
      name: cat.category,
      amount: cat.amount,
      percentage: cat.percentage,
      color: getCategoryColor(index)
    }));

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Category Insights</h3>
                <p className="text-sm text-gray-600">{categoryData.period}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${categoryData.total_spent.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h3>
          {categoryData.categories.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No category data available</p>
            </div>
          )}
        </div>

        {/* Category List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Categories</h3>
          <div className="space-y-3">
            {categoryData.categories.map((cat, index) => (
              <div key={cat.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg">
                    {getCategoryIcon(cat.category)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{cat.category}</p>
                    <p className="text-sm text-gray-600">
                      {cat.transaction_count} transactions • Avg: ${cat.avg_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${cat.amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{cat.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );

  const renderNoDataMessage = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
      <p className="text-gray-600 mb-6">
        {error || "Connect your bank account to view spending reports and insights."}
      </p>
      <button
        onClick={handleRefresh}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Spending Reports</h1>
              <p className="text-gray-600 mt-1">Analyze your spending patterns and insights</p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'monthly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Monthly
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Weekly
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            Categories
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          renderLoadingSkeleton()
        ) : error ? (
          renderNoDataMessage()
        ) : (
          <>
            {activeTab === 'monthly' && renderMonthlyReport()}
            {activeTab === 'weekly' && renderWeeklyReport()}
            {activeTab === 'categories' && renderCategoryReport()}
          </>
        )}
      </div>
    </div>
  );
} 