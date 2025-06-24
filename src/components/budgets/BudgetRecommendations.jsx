import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw, TrendingUp } from 'lucide-react';
import { budgetRecommendationsService } from '../../services/budgetRecommendationsService';

const BudgetRecommendations = ({ onUseRecommendation }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await budgetRecommendationsService.fetchBudgetRecommendations();
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching budget recommendations:', err);
      setError(err.message);
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRefresh = () => {
    fetchRecommendations();
  };

  const handleUseRecommendation = (category, amount) => {
    if (onUseRecommendation) {
      onUseRecommendation(category, amount);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-green-600" />
            Suggested Budgets
          </h3>
          <button
            onClick={handleRefresh}
            disabled
            className="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-green-600" />
            Suggested Budgets
          </h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <p className="text-gray-600 mb-1">Failed to load recommendations</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || !recommendations.has_data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-green-600" />
            Suggested Budgets
          </h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-gray-400 text-2xl mb-2">💡</div>
            <p className="text-gray-600 mb-1">No recommendations available</p>
            <p className="text-sm text-gray-500">{recommendations?.message || "Connect your bank account to get budget recommendations"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { recommendations: recs, total_recommended, categories_analyzed, message } = recommendations;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-green-600" />
          Suggested Budgets
        </h3>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-800 font-medium">Smart Recommendations</p>
        </div>
        <p className="text-sm text-green-700 mb-2">{message}</p>
        <div className="flex items-center gap-4 text-sm text-green-600">
          <span>Total suggested: {budgetRecommendationsService.formatCurrency(total_recommended)}</span>
          <span>• {categories_analyzed} categories analyzed</span>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(recs).map(([category, data]) => {
          const icon = budgetRecommendationsService.getCategoryIcon(category);
          const colorClass = budgetRecommendationsService.getCategoryColor(category);
          
          return (
            <div key={category} className={`${colorClass} rounded-lg p-4 border`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <h4 className="font-medium text-gray-800">{category}</h4>
                </div>
                <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                  {data.months_analyzed} month{data.months_analyzed !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900">
                  {budgetRecommendationsService.formatCurrency(data.amount)}
                </div>
                <div className="text-sm text-gray-600">
                  Based on {budgetRecommendationsService.formatCurrency(data.average_monthly)}/month average
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Total spent: {budgetRecommendationsService.formatCurrency(data.total_spent)}
                </div>
                <button
                  onClick={() => handleUseRecommendation(category, data.amount)}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Use this
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          💡 These are <strong>recommendations</strong> based on your spending patterns. 
          You can adjust them to fit your financial goals.
        </p>
      </div>
    </div>
  );
};

export default BudgetRecommendations; 