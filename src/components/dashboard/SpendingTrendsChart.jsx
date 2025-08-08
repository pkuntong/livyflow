import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, AlertTriangle, BarChart3 } from 'lucide-react';
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
      <div className="bg-white rounded-lg shadow-md p-6" role="region" aria-labelledby="chart-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="chart-title" className="text-lg font-semibold text-gray-800">Spending Trends</h2>
          <button
            onClick={handleRefresh}
            disabled
            className="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-md cursor-not-allowed focus:outline-none"
            aria-label="Refresh chart data"
          >
            <RefreshCw className="w-4 h-4 mr-1 inline" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-64" aria-live="polite">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
            <span className="sr-only">Loading spending trends chart</span>
            <span className="text-gray-600">Loading chart data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6" role="region" aria-labelledby="chart-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="chart-title" className="text-lg font-semibold text-gray-800">Spending Trends</h2>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Refresh chart data"
          >
            <RefreshCw className="w-4 h-4 mr-1 inline" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-64" role="alert" aria-live="polite">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-2 mx-auto" aria-hidden="true" />
            <p className="text-gray-600 mb-2">Failed to load spending trends</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6" role="region" aria-labelledby="chart-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="chart-title" className="text-lg font-semibold text-gray-800">Spending Trends</h2>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Refresh chart data"
          >
            <RefreshCw className="w-4 h-4 mr-1 inline" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-64" aria-live="polite">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mb-2 mx-auto" aria-hidden="true" />
            <p className="text-gray-600">No spending data available</p>
            <p className="text-sm text-gray-500">Connect your bank account to see spending trends</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6" role="region" aria-labelledby="chart-title">
      <div className="flex items-center justify-between mb-6">
        <h2 id="chart-title" className="text-lg font-semibold text-gray-800">Spending Trends</h2>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Refresh chart data"
        >
          <RefreshCw className="w-4 h-4 mr-1 inline" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6" role="group" aria-labelledby="filters-label">
        <h3 id="filters-label" className="sr-only">Chart filters</h3>
        
        <div className="flex flex-col">
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby="category-help"
          >
            <option value="">All Categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div id="category-help" className="sr-only">
            Filter spending trends by category. Select "All Categories" to view trends for all spending categories.
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="range-filter" className="text-sm font-medium text-gray-700 mb-1">
            Time Range
          </label>
          <select
            id="range-filter"
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby="range-help"
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div id="range-help" className="sr-only">
            Select the time period to display spending trends. Choose from 3 to 24 months of historical data.
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80" role="img" aria-labelledby="chart-description">
        <div id="chart-description" className="sr-only">
          Line chart showing spending trends over time for {selectedCategory || 'all categories'} 
          over the last {selectedRange} months. 
          {chartData.length > 0 && `Chart displays ${chartData.length} data points with ${availableCategories.length} categories tracked.`}
        </div>
        
        {/* Data table for screen readers */}
        <table className="sr-only" aria-label="Spending trends data table">
          <caption>
            Spending trends data showing monthly spending by category over {selectedRange} months
          </caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              {availableCategories.map(category => (
                <th key={category} scope="col">{category}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((data, index) => (
              <tr key={index}>
                <th scope="row">{data.name}</th>
                {availableCategories.map(category => (
                  <td key={category}>${(data[category] || 0).toFixed(2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            aria-hidden="true"
          >
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
        <div 
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4" 
          role="region" 
          aria-labelledby="stats-title"
        >
          <h3 id="stats-title" className="sr-only">Summary Statistics</h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Total Spending</h4>
            <p className="text-xl font-semibold text-gray-800" aria-describedby="total-desc">
              ${chartData.reduce((total, month) => {
                return total + Object.keys(month).reduce((monthTotal, key) => {
                  return monthTotal + (key !== 'month' && key !== 'name' ? month[key] : 0);
                }, 0);
              }, 0).toLocaleString()}
            </p>
            <div id="total-desc" className="sr-only">
              Total spending across all categories in the selected time period
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Average Monthly</h4>
            <p className="text-xl font-semibold text-gray-800" aria-describedby="avg-desc">
              ${(chartData.reduce((total, month) => {
                return total + Object.keys(month).reduce((monthTotal, key) => {
                  return monthTotal + (key !== 'month' && key !== 'name' ? month[key] : 0);
                }, 0);
              }, 0) / chartData.length).toFixed(0)}
            </p>
            <div id="avg-desc" className="sr-only">
              Average monthly spending across all categories
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-1">Categories Tracked</h4>
            <p className="text-xl font-semibold text-gray-800" aria-describedby="categories-desc">
              {availableCategories.length}
            </p>
            <div id="categories-desc" className="sr-only">
              Number of spending categories being tracked in this chart
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingTrendsChart; 