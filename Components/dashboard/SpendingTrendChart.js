import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import plaidService from '../../src/services/plaidService';

export default function SpendingTrendChart() {
  const { user } = useAuth();
  const [trendData, setTrendData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' or 'area'
  const [groupBy, setGroupBy] = useState('day'); // 'day' or 'week'
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSpendingTrend();
    }
  }, [user, groupBy]);

  const fetchSpendingTrend = async () => {
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

      // Process transactions and group by day/week
      const dailySpending = {};
      const weeklySpending = {};

      transactions.forEach(transaction => {
        // Only include negative amounts (spending)
        if (transaction.amount < 0) {
          const transactionDate = new Date(transaction.date);
          const amount = Math.abs(transaction.amount);

          // Group by day
          const dayKey = transactionDate.toISOString().split('T')[0];
          if (dailySpending[dayKey]) {
            dailySpending[dayKey] += amount;
          } else {
            dailySpending[dayKey] = amount;
          }

          // Group by week (start of week)
          const weekStart = new Date(transactionDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
          const weekKey = weekStart.toISOString().split('T')[0];
          if (weeklySpending[weekKey]) {
            weeklySpending[weekKey] += amount;
          } else {
            weeklySpending[weekKey] = amount;
          }
        }
      });

      // Generate all dates in range for complete chart
      const allDates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        allDates.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Generate all weeks in range
      const allWeeks = [];
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      while (weekStart <= endDate) {
        const weekKey = weekStart.toISOString().split('T')[0];
        allWeeks.push(weekKey);
        weekStart.setDate(weekStart.getDate() + 7);
      }

      // Create chart data
      let chartData = [];
      if (groupBy === 'day') {
        chartData = allDates.map(date => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: parseFloat((dailySpending[date] || 0).toFixed(2)),
          fullDate: date
        }));
      } else {
        chartData = allWeeks.map(week => ({
          date: `Week of ${new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          amount: parseFloat((weeklySpending[week] || 0).toFixed(2)),
          fullDate: week
        }));
      }

      // Calculate trend statistics
      const amounts = chartData.map(item => item.amount);
      const totalSpending = amounts.reduce((sum, amount) => sum + amount, 0);
      const averageSpending = totalSpending / amounts.length;
      const maxSpending = Math.max(...amounts);
      const minSpending = Math.min(...amounts);

      console.log("📊 Processed trend data:", chartData);
      console.log("📈 Statistics:", { totalSpending, averageSpending, maxSpending, minSpending });
      
      setTrendData(chartData);

    } catch (error) {
      console.error("❌ Error fetching spending trend:", error);
      
      if (error.response?.status === 400) {
        setError("No bank account connected. Connect your bank account to see spending trends.");
      } else {
        setError("Failed to load spending trend data. Please try again.");
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
      await fetchSpendingTrend();
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
          <p className="font-semibold text-gray-900">{data.date}</p>
          <p className="text-red-600 font-medium">{formatCurrency(data.amount)}</p>
        </div>
      );
    }
    return null;
  };

  // Calculate trend statistics
  const amounts = trendData.map(item => item.amount);
  const totalSpending = amounts.reduce((sum, amount) => sum + amount, 0);
  const averageSpending = amounts.length > 0 ? totalSpending / amounts.length : 0;
  const maxSpending = amounts.length > 0 ? Math.max(...amounts) : 0;
  const minSpending = amounts.length > 0 ? Math.min(...amounts) : 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Spending Trend Over Time</h2>
          <p className="text-sm text-gray-600 mt-1">Past 30 days spending pattern</p>
        </div>
        <div className="p-6 flex items-center justify-center h-[300px]">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            Loading trend data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Spending Trend Over Time</h2>
          <p className="text-sm text-gray-600 mt-1">Past 30 days spending pattern</p>
        </div>
        <div className="p-6 flex items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Spending Trend Over Time</h2>
          <p className="text-sm text-gray-600 mt-1">Past 30 days spending pattern</p>
        </div>
        <div className="p-6 flex items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p>No spending data for the past 30 days</p>
            <p className="text-sm mt-1">Connect your bank account or add transactions to see spending trends</p>
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
            <h2 className="text-xl font-semibold text-gray-900">Spending Trend Over Time</h2>
            <p className="text-sm text-gray-600 mt-1">Past 30 days spending pattern</p>
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
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </select>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                chartType === 'line' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                chartType === 'area' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Area
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  angle={groupBy === 'day' ? -45 : 0}
                  textAnchor={groupBy === 'day' ? 'end' : 'middle'}
                  height={groupBy === 'day' ? 60 : 30}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  angle={groupBy === 'day' ? -45 : 0}
                  textAnchor={groupBy === 'day' ? 'end' : 'middle'}
                  height={groupBy === 'day' ? 60 : 30}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#EF4444" 
                  fill="#FEE2E2"
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Spending</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(totalSpending)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Average Daily</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(averageSpending)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Highest Day</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(maxSpending)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Lowest Day</p>
              <p className="font-semibold text-green-600">
                {formatCurrency(minSpending)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 