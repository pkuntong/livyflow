import React, { useState, useEffect } from 'react';
import { recurringSubscriptionsService } from '../services/recurringSubscriptionsService';

const RecurringSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [message, setMessage] = useState('');
  const [hasData, setHasData] = useState(false);
  const [canceledSubscriptions, setCanceledSubscriptions] = useState(new Set());
  const [priceIncreasesCount, setPriceIncreasesCount] = useState(0);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await recurringSubscriptionsService.getRecurringSubscriptions();
      
      setSubscriptions(data.subscriptions || []);
      setTotalMonthly(data.total_monthly || 0);
      setMessage(data.message || '');
      setHasData(data.has_data || false);
      setPriceIncreasesCount(data.price_increases_count || 0);
      
    } catch (err) {
      console.error('Error fetching recurring subscriptions:', err);
      setError(err.message);
      setSubscriptions([]);
      setTotalMonthly(0);
      setHasData(false);
      setPriceIncreasesCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleMarkAsCanceled = (subscriptionId) => {
    setCanceledSubscriptions(prev => new Set([...prev, subscriptionId]));
  };

  const handleRefresh = () => {
    fetchSubscriptions();
  };

  const handleTestData = async () => {
    try {
      setLoading(true);
      await recurringSubscriptionsService.createTestData();
      // Refresh the subscriptions after creating test data
      await fetchSubscriptions();
    } catch (err) {
      console.error('Error creating test data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeSubscriptions = subscriptions.filter(sub => !canceledSubscriptions.has(sub.id));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Recurring Subscriptions
          </h3>
          <button
            onClick={handleRefresh}
            disabled
            className="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Detecting subscriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Recurring Subscriptions
          </h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Retry
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasData || activeSubscriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Recurring Subscriptions
          </h3>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-3">💳</div>
          <p className="text-gray-600 mb-2">{message || 'No recurring subscriptions found'}</p>
          <p className="text-sm text-gray-500">
            Connect your bank account to automatically detect recurring charges
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Recurring Subscriptions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {activeSubscriptions.length} active subscriptions • ${totalMonthly.toFixed(2)}/month
            {priceIncreasesCount > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                • {priceIncreasesCount} price increase(s)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestData}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            title="Create test data"
          >
            Test Data
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {activeSubscriptions.map((subscription) => {
          const icon = recurringSubscriptionsService.getSubscriptionIcon(subscription.name);
          const frequencyColor = recurringSubscriptionsService.getFrequencyColor(subscription.frequency);
          const nextExpected = recurringSubscriptionsService.formatNextExpectedDate(subscription.next_expected);
          
          return (
            <div
              key={subscription.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                subscription.has_increase 
                  ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                  : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{icon}</div>
                <div>
                  <h4 className="font-medium text-gray-900">{subscription.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-lg font-semibold text-gray-900">
                      ${subscription.amount.toFixed(2)}
                    </span>
                    {subscription.has_increase && (
                      <span className="text-sm text-orange-600 font-medium">
                        ↑ ${subscription.amount_change.toFixed(2)}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${frequencyColor}`}>
                      {subscription.frequency}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>Last: {new Date(subscription.last_date).toLocaleDateString()}</span>
                    <span>Next: {nextExpected}</span>
                    <span>{subscription.transaction_count} charges</span>
                  </div>
                  {subscription.increase_alert && (
                    <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded-md">
                      <p className="text-sm text-orange-800 font-medium">
                        ⚠️ {subscription.increase_alert}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleMarkAsCanceled(subscription.id)}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  title="Mark as canceled"
                >
                  Canceled
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {canceledSubscriptions.size > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {canceledSubscriptions.size} subscription(s) marked as canceled
          </p>
        </div>
      )}
    </div>
  );
};

export default RecurringSubscriptions; 