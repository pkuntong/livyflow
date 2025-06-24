import React, { useState, useEffect } from 'react';
import { alertService } from '../services/alertService';

const AlertSettings = () => {
  const [alertRules, setAlertRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'balance_low',
    threshold: '',
    enabled: true
  });

  const alertTypes = [
    { value: 'balance_low', label: 'Low Balance Alert', description: 'Notify when account balance drops below threshold' },
    { value: 'spending_high', label: 'High Spending Alert', description: 'Notify when weekly spending exceeds threshold' },
    { value: 'recurring_subscription', label: 'New Subscription Alert', description: 'Notify when new recurring charges are detected' },
    { value: 'budget_exceeded', label: 'Budget Exceeded Alert', description: 'Notify when monthly budget is exceeded' }
  ];

  const fetchAlertRules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await alertService.getAlertRules();
      setAlertRules(data.alert_rules || []);
      
    } catch (err) {
      console.error('Error fetching alert rules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertRules();
  }, []);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const alertData = {
        ...formData,
        threshold: parseFloat(formData.threshold)
      };
      
      await alertService.createAlertRule(alertData);
      
      // Show success toast
      if (window.showToast) {
        window.showToast('Alert rule created successfully!', 'success');
      }
      
      // Reset form and refresh
      setFormData({
        name: '',
        type: 'balance_low',
        threshold: '',
        enabled: true
      });
      setShowCreateForm(false);
      await fetchAlertRules();
      
    } catch (err) {
      console.error('Error creating alert rule:', err);
      setError(err.message);
      
      // Show error toast
      if (window.showToast) {
        window.showToast(`Failed to create alert: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlert = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const alertData = {
        ...formData,
        threshold: parseFloat(formData.threshold)
      };
      
      await alertService.updateAlertRule(editingAlert.id, alertData);
      
      // Show success toast
      if (window.showToast) {
        window.showToast('Alert rule updated successfully!', 'success');
      }
      
      // Reset form and refresh
      setFormData({
        name: '',
        type: 'balance_low',
        threshold: '',
        enabled: true
      });
      setEditingAlert(null);
      await fetchAlertRules();
      
    } catch (err) {
      console.error('Error updating alert rule:', err);
      setError(err.message);
      
      // Show error toast
      if (window.showToast) {
        window.showToast(`Failed to update alert: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }
    
    try {
      setLoading(true);
      await alertService.deleteAlertRule(alertId);
      
      // Show success toast
      if (window.showToast) {
        window.showToast('Alert rule deleted successfully!', 'success');
      }
      
      await fetchAlertRules();
    } catch (err) {
      console.error('Error deleting alert rule:', err);
      setError(err.message);
      
      // Show error toast
      if (window.showToast) {
        window.showToast(`Failed to delete alert: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setFormData({
      name: alert.name,
      type: alert.type,
      threshold: alert.threshold.toString(),
      enabled: alert.enabled
    });
  };

  const handleCancelEdit = () => {
    setEditingAlert(null);
    setFormData({
      name: '',
      type: 'balance_low',
      threshold: '',
      enabled: true
    });
  };

  const handleTestAlerts = async () => {
    try {
      setLoading(true);
      const result = await alertService.checkAlerts();
      
      // Show result toast
      if (window.showToast) {
        if (result.triggers && result.triggers.length > 0) {
          window.showToast(`${result.triggers.length} alerts triggered!`, 'warning');
        } else {
          window.showToast('Alert check completed - no alerts triggered', 'info');
        }
      }
    } catch (err) {
      console.error('Error testing alerts:', err);
      setError(err.message);
      
      // Show error toast
      if (window.showToast) {
        window.showToast(`Failed to test alerts: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading alert settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🔔</span>
            Alert Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Set up alerts to stay informed about your financial activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestAlerts}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            Test Alerts
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            + Add Alert
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingAlert) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">
            {editingAlert ? 'Edit Alert Rule' : 'Create New Alert Rule'}
          </h4>
          
          <form onSubmit={editingAlert ? handleUpdateAlert : handleCreateAlert}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Low Balance Warning"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {alertTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50.00"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Description:</strong> {alertTypes.find(t => t.value === formData.type)?.description}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
              <button
                type="button"
                onClick={editingAlert ? handleCancelEdit : () => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alert Rules List */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Active Alert Rules ({alertRules.length})</h4>
        
        {alertRules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">🔔</div>
            <p>No alert rules configured</p>
            <p className="text-sm mt-1">Create your first alert rule to get started</p>
          </div>
        ) : (
          alertRules.map((alert) => {
            const icon = alertService.getAlertTypeIcon(alert.type);
            const color = alertService.getAlertTypeColor(alert.type);
            const displayName = alertService.getAlertTypeDisplayName(alert.type);
            
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-colors ${
                  alert.enabled 
                    ? 'bg-white border-gray-200 hover:bg-gray-50' 
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{icon}</div>
                    <div>
                      <h5 className="font-medium text-gray-900">{alert.name}</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
                          {displayName}
                        </span>
                        <span className="text-sm text-gray-600">
                          Threshold: ${alert.threshold.toFixed(2)}
                        </span>
                        {!alert.enabled && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {new Date(alert.created_at).toLocaleDateString()}
                        {alert.last_triggered && (
                          <span className="ml-2">
                            • Last triggered: {alertService.formatTriggerDate(alert.last_triggered)}
                          </span>
                        )}
                        {alert.trigger_count > 0 && (
                          <span className="ml-2">
                            • Triggered {alert.trigger_count} time{alert.trigger_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditAlert(alert)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertSettings; 