import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trendsService } from '../../services/trendsService';

const SpendingTrendsChart = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRange, setSelectedRange] = useState('6');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [chartData, setChartData] = useState([]);

  const rangeOptions = [
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
    { value: '18', label: '18 Months' },
    { value: '24', label: '24 Months' }
  ];

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await trendsService.fetchSpendingTrends(selectedCategory || null, selectedRange);
      
      if (data.trends && data.trends.length > 0) {
        setTrends(data.trends);
        const categories = trendsService.getUniqueCategories(data.trends);
        setAvailableCategories(categories);
        
        // Format data for charts
        const formattedData = trendsService.formatDataForCharts(data.trends);
        setChartData(formattedData);
      } else {
        setTrends([]);
        setAvailableCategories([]);
        setChartData([]);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
      setError(err.message);
      setTrends([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [selectedCategory, selectedRange]);

  const handleRefresh = () => {
    fetchTrends();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Spending Trends</h3>
          <button
            onClick={handleRefresh}
            disabled
            className="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Spending Trends</h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-2">⚠️</div>
            <p className="text-gray-600 mb-2">Failed to load spending trends</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Spending Trends</h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">📊</div>
            <p className="text-gray-600">No spending data available</p>
            <p className="text-sm text-gray-500">Connect your bank account to see spending trends</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Spending Trends</h3>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Time Range</label>
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            
            {availableCategories.map((category, index) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={trendsService.getCategoryColor(category, index)}
                strokeWidth={2}
                dot={{ fill: trendsService.getCategoryColor(category, index), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: trendsService.getCategoryColor(category, index), strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Total Spending</h4>
            <p className="text-xl font-semibold text-gray-800">
              ${chartData.reduce((total, month) => {
                return total + Object.keys(month).reduce((monthTotal, key) => {
                  return monthTotal + (key !== 'month' && key !== 'name' ? month[key] : 0);
                }, 0);
              }, 0).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Average Monthly</h4>
            <p className="text-xl font-semibold text-gray-800">
              ${(chartData.reduce((total, month) => {
                return total + Object.keys(month).reduce((monthTotal, key) => {
                  return monthTotal + (key !== 'month' && key !== 'name' ? month[key] : 0);
                }, 0);
              }, 0) / chartData.length).toFixed(0)}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Categories Tracked</h4>
            <p className="text-xl font-semibold text-gray-800">
              {availableCategories.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingTrendsChart; 