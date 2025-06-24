import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, DollarSign, Calendar, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { fetchInsights, createTestInsights } from '../services/insightService';

const Insights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch insights
  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInsights();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Error loading insights:', err);
      setError('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  // Create test insights
  const handleCreateTestInsights = async () => {
    try {
      setIsGenerating(true);
      await createTestInsights();
      await loadInsights(); // Reload insights
    } catch (err) {
      console.error('Error creating test insights:', err);
      setError('Failed to create test insights');
    } finally {
      setIsGenerating(false);
    }
  };

  // Load insights on component mount
  useEffect(() => {
    loadInsights();
  }, []);

  // Get icon based on insight type
  const getInsightIcon = (type) => {
    switch (type) {
      case 'spending':
        return <DollarSign className="w-5 h-5" />;
      case 'savings':
        return <TrendingUp className="w-5 h-5" />;
      case 'subscription':
        return <Calendar className="w-5 h-5" />;
      case 'pattern':
        return <Zap className="w-5 h-5" />;
      default:
        return <Brain className="w-5 h-5" />;
    }
  };

  // Get color based on insight type
  const getInsightColor = (type) => {
    switch (type) {
      case 'spending':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'savings':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'subscription':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'pattern':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Get background color for icon
  const getIconBgColor = (type) => {
    switch (type) {
      case 'spending':
        return 'bg-red-100 text-red-600';
      case 'savings':
        return 'bg-green-100 text-green-600';
      case 'subscription':
        return 'bg-blue-100 text-blue-600';
      case 'pattern':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format amount
  const formatAmount = (amount, type) => {
    if (amount === null || amount === undefined) return null;
    
    if (type === 'pattern' && amount <= 1) {
      return `${(amount * 100).toFixed(0)}%`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Insights</h2>
              <p className="text-sm text-gray-600">Smart analysis of your spending patterns</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateTestInsights}
              disabled={isGenerating}
              className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors"
              title="Create test insights"
            >
              {isGenerating ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </div>
              ) : (
                'Test'
              )}
            </button>
            <button
              onClick={loadInsights}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading && insights.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-purple-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Analyzing your spending patterns...</span>
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Yet</h3>
            <p className="text-gray-600 mb-4">
              Connect your bank account and add some transactions to get AI-powered insights about your spending patterns.
            </p>
            <button
              onClick={handleCreateTestInsights}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Test Insights...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Test Insights
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getIconBgColor(insight.type)}`}>
                    {getInsightIcon(insight.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {insight.title}
                        </h3>
                        <p className="text-sm opacity-90 leading-relaxed">
                          {insight.description}
                        </p>
                        
                        {/* Additional details */}
                        <div className="flex items-center gap-4 mt-3 text-xs opacity-75">
                          <span>{formatTimestamp(insight.created_at)}</span>
                          {insight.category && (
                            <span className="px-2 py-1 bg-white bg-opacity-50 rounded-full">
                              {insight.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          )}
                          {insight.amount && (
                            <span className="font-medium">
                              {formatAmount(insight.amount, insight.type)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {insights.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{insights.length} insight{insights.length !== 1 ? 's' : ''} generated</span>
              <span className="text-xs">
                Insights are generated automatically based on your transaction data
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights; 