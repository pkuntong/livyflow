import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, X, Bell, DollarSign, TrendingDown, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import alertsService from '../services/alertsService';

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await alertsService.getAlerts();
      
      setAlerts(response.alerts || []);
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 400) {
        // No bank account connected - this is expected for new users
        setAlerts([]);
      } else if (error.response?.status === 401) {
        // Authentication error
        setError("Authentication failed. Please sign in again.");
        setAlerts([]);
      } else if (error.response?.status === 403) {
        // Forbidden
        setError("Access denied. Please check your permissions.");
        setAlerts([]);
      } else {
        // Generic error
        setError("Failed to load alerts. Please try again.");
        setAlerts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const getAlertIcon = (type, category) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'danger':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getAlertStyles = (type) => {
    switch (type) {
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          iconBgColor: 'bg-yellow-100'
        };
      case 'danger':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          iconBgColor: 'bg-red-100'
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600',
          iconBgColor: 'bg-gray-100'
        };
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'balance':
        return DollarSign;
      case 'transaction':
        return CreditCard;
      case 'budget':
        return TrendingDown;
      default:
        return Bell;
    }
  };

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Loading alerts...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return null; // Don't show anything if no alerts
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Financial Alerts</h3>
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {activeAlerts.length}
          </span>
        </div>
        
        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <div className="space-y-3">
        {activeAlerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const IconComponent = getAlertIcon(alert.type, alert.category);
          const CategoryIcon = getCategoryIcon(alert.category);
          
          return (
            <div
              key={alert.id}
              className={`p-4 ${styles.bgColor} border ${styles.borderColor} rounded-lg relative`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 ${styles.iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`w-4 h-4 ${styles.iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-medium ${styles.textColor}`}>
                          {alert.title}
                        </h4>
                        <CategoryIcon className="w-3 h-3 text-gray-500" />
                      </div>
                      <p className={`text-sm ${styles.textColor}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(alert.timestamp)}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      aria-label="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Additional details based on alert category */}
                  {alert.category === 'balance' && alert.balance !== undefined && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded border">
                      <p className="text-xs text-gray-600">
                        Current balance: <span className="font-medium">${alert.balance.toFixed(2)}</span>
                      </p>
                    </div>
                  )}
                  
                  {alert.category === 'transaction' && alert.amount !== undefined && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded border">
                      <p className="text-xs text-gray-600">
                        Amount: <span className="font-medium">${Math.abs(alert.amount).toFixed(2)}</span>
                        {alert.date && (
                          <span className="ml-2">
                            Date: <span className="font-medium">{new Date(alert.date).toLocaleDateString()}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {activeAlerts.length > 0 && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setDismissedAlerts(new Set(alerts.map(alert => alert.id)))}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Dismiss all alerts
          </button>
        </div>
      )}
    </div>
  );
} 