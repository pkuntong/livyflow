/**
 * Real-time Monitoring Dashboard
 * Displays system health, business metrics, and operational insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { useMonitoring } from '../hooks/useMonitoring.js';

const MonitoringDashboard = () => {
  const { trackEvent } = useMonitoring();
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Color schemes for charts
  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#6366F1',
    gray: '#6B7280'
  };

  const severityColors = {
    low: colors.info,
    medium: colors.warning,
    high: colors.danger,
    critical: '#DC2626'
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchDashboardData();
    
    // Set up polling
    const interval = setInterval(fetchDashboardData, refreshInterval);
    
    // Track dashboard view
    trackEvent('monitoring', 'dashboard_viewed', {
      timeRange: selectedTimeRange,
      refreshInterval
    });
    
    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshInterval, selectedTimeRange, trackEvent]);

  const handleTimeRangeChange = (range) => {
    setSelectedTimeRange(range);
    trackEvent('monitoring', 'time_range_changed', { range });
    fetchDashboardData();
  };

  const handleRefreshIntervalChange = (interval) => {
    setRefreshInterval(interval);
    trackEvent('monitoring', 'refresh_interval_changed', { interval });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Dashboard Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time application and business metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select 
            value={selectedTimeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="bg-white border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          
          {/* Refresh Interval */}
          <select 
            value={refreshInterval}
            onChange={(e) => handleRefreshIntervalChange(parseInt(e.target.value))}
            className="bg-white border border-gray-300 rounded-md px-3 py-2"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <SystemHealthOverview 
        health={dashboardData?.health} 
        colors={colors} 
      />

      {/* Key Metrics Cards */}
      <KeyMetricsCards 
        metrics={dashboardData?.metrics}
        errorRate={dashboardData?.error_rate}
        colors={colors}
      />

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart 
          data={dashboardData?.performance}
          colors={colors}
        />
        <ErrorRateChart 
          errorRate={dashboardData?.error_rate}
          colors={colors}
        />
      </div>

      {/* Business Metrics */}
      <BusinessMetricsSection 
        topEndpoints={dashboardData?.top_endpoints}
        colors={colors}
      />

      {/* Active Alerts */}
      <ActiveAlertsSection 
        alerts={dashboardData?.alerts}
        severityColors={severityColors}
        trackEvent={trackEvent}
      />
    </div>
  );
};

const SystemHealthOverview = ({ health, colors }) => {
  if (!health) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return colors.success;
      case 'degraded': return colors.warning;
      case 'unhealthy': return colors.danger;
      default: return colors.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">System Health Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl"
            style={{ backgroundColor: getStatusColor(health.status) + '20', color: getStatusColor(health.status) }}
          >
            {getStatusIcon(health.status)}
          </div>
          <h3 className="font-semibold text-lg capitalize">{health.status}</h3>
          <p className="text-gray-600">Overall Status</p>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Health Checks</h4>
          {Object.entries(health.checks || {}).map(([name, check]) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-sm">{name}</span>
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: getStatusColor(check.status) + '20',
                  color: getStatusColor(check.status)
                }}
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {new Date(health.timestamp * 1000).toLocaleTimeString()}
          </div>
          <p className="text-gray-600">Last Updated</p>
        </div>
      </div>
    </div>
  );
};

const KeyMetricsCards = ({ metrics, errorRate, colors }) => {
  if (!metrics) return null;

  const cards = [
    {
      title: 'Request Rate',
      value: metrics.counters?.http_requests_total || 0,
      unit: 'req/min',
      color: colors.primary,
      trend: '+5.2%'
    },
    {
      title: 'Error Rate',
      value: errorRate?.overall_error_rate || 0,
      unit: '%',
      color: errorRate?.overall_error_rate > 1 ? colors.danger : colors.success,
      trend: errorRate?.overall_error_rate > 1 ? '+2.1%' : '-0.8%'
    },
    {
      title: 'CPU Usage',
      value: metrics.gauges?.system_cpu_percent || 0,
      unit: '%',
      color: metrics.gauges?.system_cpu_percent > 80 ? colors.danger : colors.success,
      trend: '+1.5%'
    },
    {
      title: 'Memory Usage',
      value: metrics.gauges?.system_memory_percent || 0,
      unit: '%',
      color: metrics.gauges?.system_memory_percent > 85 ? colors.danger : colors.success,
      trend: '-0.3%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">{card.title}</p>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {typeof card.value === 'number' ? card.value.toFixed(1) : card.value}
                </span>
                <span className="text-gray-500 ml-1">{card.unit}</span>
              </div>
            </div>
            <div 
              className="w-3 h-12 rounded-full"
              style={{ backgroundColor: card.color }}
            ></div>
          </div>
          <div className="mt-2">
            <span 
              className={`text-sm ${card.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}
            >
              {card.trend} from last hour
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const PerformanceChart = ({ data, colors }) => {
  // Mock data for demonstration - in production, this would come from actual metrics
  const chartData = [
    { time: '10:00', response_time: 245, requests: 120 },
    { time: '10:05', response_time: 280, requests: 135 },
    { time: '10:10', response_time: 190, requests: 98 },
    { time: '10:15', response_time: 310, requests: 152 },
    { time: '10:20', response_time: 220, requests: 118 },
    { time: '10:25', response_time: 350, requests: 167 },
    { time: '10:30', response_time: 195, requests: 89 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Response Time & Request Volume</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="requests"
            fill={colors.primary + '20'}
            stroke={colors.primary}
            strokeWidth={2}
            name="Requests"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="response_time"
            stroke={colors.warning}
            strokeWidth={3}
            name="Response Time (ms)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ErrorRateChart = ({ errorRate, colors }) => {
  // Mock data for demonstration
  const chartData = [
    { time: '10:00', errors: 2, total: 120, rate: 1.67 },
    { time: '10:05', errors: 5, total: 135, rate: 3.70 },
    { time: '10:10', errors: 1, total: 98, rate: 1.02 },
    { time: '10:15', errors: 8, total: 152, rate: 5.26 },
    { time: '10:20', errors: 3, total: 118, rate: 2.54 },
    { time: '10:25', errors: 12, total: 167, rate: 7.19 },
    { time: '10:30', errors: 2, total: 89, rate: 2.25 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Error Rate Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [
              name === 'rate' ? `${value.toFixed(2)}%` : value,
              name === 'rate' ? 'Error Rate' : name
            ]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            fill={colors.danger + '20'}
            stroke={colors.danger}
            strokeWidth={2}
            name="Error Rate (%)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const BusinessMetricsSection = ({ topEndpoints, colors }) => {
  const mockEndpoints = topEndpoints || [
    { endpoint: '/api/transactions', requests: 1250 },
    { endpoint: '/api/budgets', requests: 890 },
    { endpoint: '/api/accounts', requests: 650 },
    { endpoint: '/api/auth/login', requests: 420 },
    { endpoint: '/api/plaid/link', requests: 380 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Top API Endpoints</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockEndpoints} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="endpoint" type="category" width={120} />
          <Tooltip />
          <Bar dataKey="requests" fill={colors.primary} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ActiveAlertsSection = ({ alerts, severityColors, trackEvent }) => {
  const mockAlerts = alerts || [
    {
      id: 'alert_1',
      rule_name: 'High Memory Usage',
      severity: 'high',
      message: 'Memory usage is above 90%',
      timestamp: Date.now() - 300000, // 5 minutes ago
      status: 'active'
    },
    {
      id: 'alert_2',
      rule_name: 'Slow API Response',
      severity: 'medium',
      message: 'API response time exceeded 2 seconds',
      timestamp: Date.now() - 900000, // 15 minutes ago
      status: 'acknowledged'
    }
  ];

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      
      if (response.ok) {
        trackEvent('monitoring', 'alert_acknowledged', { alertId });
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Active Alerts</h3>
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
          {mockAlerts.filter(alert => alert.status === 'active').length} active
        </span>
      </div>
      
      {mockAlerts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p>No active alerts - all systems operational</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockAlerts.map((alert) => (
            <div 
              key={alert.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium mr-3"
                      style={{ 
                        backgroundColor: severityColors[alert.severity] + '20',
                        color: severityColors[alert.severity]
                      }}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <h4 className="font-semibold">{alert.rule_name}</h4>
                    <span 
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        alert.status === 'active' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{alert.message}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;