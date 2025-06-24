import React, { useState, useEffect } from 'react';
import { alertService } from '../services/alertService';

const AlertHistory = () => {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTriggers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await alertService.getAlertTriggers();
      setTriggers(data.triggers || []);
      
    } catch (err) {
      console.error('Error fetching alert triggers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  const handleResolveTrigger = async (triggerId) => {
    try {
      await alertService.resolveAlertTrigger(triggerId);
      await fetchTriggers(); // Refresh the list
    } catch (err) {
      console.error('Error resolving trigger:', err);
      setError(err.message);
    }
  };

  const handleRefresh = () => {
    fetchTriggers();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading alert history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            Alert History
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Recent alert triggers and their status
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="space-y-4">
        {triggers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">✅</div>
            <p>No alert triggers found</p>
            <p className="text-sm mt-1">All clear! No alerts have been triggered recently.</p>
          </div>
        ) : (
          triggers.map((trigger) => (
            <div
              key={trigger.id}
              className={`p-4 rounded-lg border transition-colors ${
                trigger.resolved
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {trigger.resolved ? '✅' : '⚠️'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      trigger.resolved ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {trigger.message}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className={`${
                        trigger.resolved ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {alertService.formatTriggerDate(trigger.triggered_at)}
                      </span>
                      {trigger.resolved && (
                        <span className="text-green-600">
                          Resolved: {alertService.formatTriggerDate(trigger.resolved_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {!trigger.resolved && (
                  <button
                    onClick={() => handleResolveTrigger(trigger.id)}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertHistory; 