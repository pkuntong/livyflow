import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Calendar, DollarSign, RefreshCw, Loader2 } from 'lucide-react';
import { fetchInsights } from '../services/insightService';

const Insights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {insight.category && (
                            <span className="bg-white bg-opacity-50 px-2 py-1 rounded">
                              {insight.category.replace('_', ' ')}
                            </span>
                          )}
                          {insight.amount !== null && insight.amount !== undefined && (
                            <span className="font-medium">
                              {formatAmount(insight.amount, insight.type)}
                            </span>
                          )}
                          <span>{formatTimestamp(insight.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights; 