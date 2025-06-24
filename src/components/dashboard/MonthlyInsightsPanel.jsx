import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { monthlyInsightsService } from '../../services/monthlyInsightsService';

const MonthlyInsightsPanel = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await monthlyInsightsService.fetchMonthlyInsights();
      setInsights(data);
    } catch (err) {
      console.error('Error fetching monthly insights:', err);
      setError(err.message);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = () => {
    fetchInsights();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Insights</h3>
          <button
            onClick={handleRefresh}
            disabled
            className="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Insights</h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <p className="text-gray-600 mb-1">Failed to load insights</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights || !insights.summary) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Insights</h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-gray-400 text-2xl mb-2">📊</div>
            <p className="text-gray-600">No insights available</p>
            <p className="text-sm text-gray-500">Connect your bank account to see monthly insights</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, category_changes, largest_increase, largest_decrease } = insights;
  const totalChangeIndicator = monthlyInsightsService.getChangeIndicator(summary.total_change_percent);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Monthly Insights</h3>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800">This Month's Spending</h4>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${totalChangeIndicator.bgColor}`}>
            <span className="text-sm">{totalChangeIndicator.icon}</span>
            <span className={`text-sm font-medium ${totalChangeIndicator.color}`}>
              {summary.total_change_percent > 0 ? '+' : ''}{summary.total_change_percent}%
            </span>
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-2">
          {monthlyInsightsService.formatCurrency(summary.current_month_total)}
        </div>
        <p className="text-sm text-gray-600 mb-3">{summary.message}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>vs {monthlyInsightsService.formatCurrency(summary.previous_month_total)} last month</span>
        </div>
      </div>

      {/* Category Changes */}
      {category_changes && category_changes.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Category Changes</h4>
          <div className="space-y-3">
            {category_changes.slice(0, 5).map((change, index) => {
              const indicator = monthlyInsightsService.getChangeIndicator(change.change_percent);
              const icon = monthlyInsightsService.getCategoryIcon(change.category);
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="font-medium text-gray-800">{change.category}</p>
                      <p className="text-sm text-gray-500">
                        {monthlyInsightsService.formatCurrency(change.current_amount)} this month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${indicator.bgColor}`}>
                      <span className="text-xs">{indicator.icon}</span>
                      <span className={`text-sm font-medium ${indicator.color}`}>
                        {change.change_percent > 0 ? '+' : ''}{change.change_percent}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Largest Changes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Largest Increase */}
        {largest_increase && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-800">Largest Increase</h4>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{monthlyInsightsService.getCategoryIcon(largest_increase.category)}</span>
              <span className="font-medium text-gray-800">{largest_increase.category}</span>
            </div>
            <p className="text-red-600 font-semibold">+{largest_increase.change_percent}%</p>
            <p className="text-sm text-gray-600">
              {monthlyInsightsService.formatCurrency(largest_increase.current_amount)} vs {monthlyInsightsService.formatCurrency(largest_increase.previous_amount)}
            </p>
          </div>
        )}

        {/* Largest Decrease */}
        {largest_decrease && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Largest Decrease</h4>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{monthlyInsightsService.getCategoryIcon(largest_decrease.category)}</span>
              <span className="font-medium text-gray-800">{largest_decrease.category}</span>
            </div>
            <p className="text-green-600 font-semibold">{largest_decrease.change_percent}%</p>
            <p className="text-sm text-gray-600">
              {monthlyInsightsService.formatCurrency(largest_decrease.current_amount)} vs {monthlyInsightsService.formatCurrency(largest_decrease.previous_amount)}
            </p>
          </div>
        )}
      </div>

      {/* No Data Message */}
      {(!category_changes || category_changes.length === 0) && (
        <div className="text-center py-6">
          <div className="text-gray-400 text-3xl mb-2">📊</div>
          <p className="text-gray-600 mb-1">Not enough data yet for insights</p>
          <p className="text-sm text-gray-500">Start spending to see monthly comparisons</p>
        </div>
      )}
    </div>
  );
};

export default MonthlyInsightsPanel; 