import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, CheckCircle, AlertCircle, RefreshCw, Loader2, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import budgetService from '../../services/budgetService';

const BudgetSuggestions = ({ onApplySuggestion }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyingSuggestion, setApplyingSuggestion] = useState(null);

  // Fetch budget suggestions
  const loadSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await budgetService.getBudgetSuggestions();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error loading budget suggestions:', err);
      setError('Failed to load budget suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Apply a budget suggestion
  const handleApplySuggestion = async (suggestion) => {
    try {
      setApplyingSuggestion(suggestion.category);
      
      // Create budget data from suggestion
      const budgetData = {
        category: suggestion.category,
        monthly_limit: suggestion.suggested_budget,
        description: `AI-suggested budget based on spending patterns`
      };
      
      // Call the parent component's onApplySuggestion function
      await onApplySuggestion(budgetData);
      
      // Remove the applied suggestion from the list
      setSuggestions(prev => prev.filter(s => s.category !== suggestion.category));
      
    } catch (err) {
      console.error('Error applying budget suggestion:', err);
      setError('Failed to apply budget suggestion');
    } finally {
      setApplyingSuggestion(null);
    }
  };

  // Load suggestions on component mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get confidence icon
  const getConfidenceIcon = (confidence) => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4" />;
      case 'low':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Smart Budget Suggestions</h2>
              <p className="text-sm text-gray-600">AI-powered recommendations based on your spending patterns</p>
            </div>
          </div>
          
          <button
            onClick={loadSuggestions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading && suggestions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Analyzing your spending patterns...</span>
            </div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Suggestions Available</h3>
            <p className="text-gray-600 mb-4">
              Connect your bank account and add some transactions to get personalized budget suggestions.
            </p>
            <div className="text-sm text-gray-500">
              <p>We analyze your spending patterns over the last 3 months to suggest optimal budget limits.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.category}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {suggestion.category_display}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                        {getConfidenceIcon(suggestion.confidence)}
                        {suggestion.confidence} confidence
                      </span>
                    </div>

                    {/* Suggested Budget */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-2xl font-bold text-green-600">
                          ${suggestion.suggested_budget}
                        </span>
                        <span className="text-sm text-gray-500">/month</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Avg Monthly:</span>
                        <span className="ml-2 font-medium">${suggestion.avg_monthly_spending}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Transactions:</span>
                        <span className="ml-2 font-medium">{suggestion.transaction_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">3-Month Total:</span>
                        <span className="ml-2 font-medium">${suggestion.total_spent_3months}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Outliers:</span>
                        <span className="ml-2 font-medium">{suggestion.outlier_percentage}%</span>
                      </div>
                    </div>

                    {/* Insight */}
                    <p className="text-sm text-gray-600 mb-3">
                      {suggestion.insight}
                    </p>

                    {/* Last Transaction */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Last transaction: {new Date(suggestion.last_transaction_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      disabled={applyingSuggestion === suggestion.category}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {applyingSuggestion === suggestion.category ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Apply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {suggestions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available</span>
              <span className="text-xs">
                Based on 3 months of transaction data
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSuggestions; 