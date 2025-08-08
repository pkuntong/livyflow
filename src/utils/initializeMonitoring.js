/**
 * Initialize Monitoring for LivyFlow Frontend
 * Sets up comprehensive monitoring, error tracking, and business metrics
 */

import monitoringService from '../services/monitoringService.js';
import apiMonitoring from '../services/apiMonitoring.js';
import businessMetricsService from '../services/businessMetrics.js';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

class MonitoringInitializer {
  constructor() {
    this.initialized = false;
    this.config = {
      environment: import.meta.env.MODE || 'development',
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      enabledFeatures: {
        performance: true,
        errors: true,
        userBehavior: true,
        businessMetrics: true,
        apiMonitoring: true
      }
    };
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('[Monitoring] Initializing observability system...');

    try {
      // Initialize core monitoring
      await this.initializeCore();
      
      // Setup user tracking
      this.setupUserTracking();
      
      // Setup business event tracking
      this.setupBusinessTracking();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Setup error tracking
      this.setupErrorTracking();
      
      // Setup API monitoring
      this.setupApiMonitoring();
      
      // Setup page lifecycle tracking
      this.setupPageLifecycleTracking();
      
      this.initialized = true;
      console.log('[Monitoring] Observability system initialized successfully');
      
      // Track initialization
      monitoringService.trackEvent('monitoring', 'system_initialized', {
        environment: this.config.environment,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('[Monitoring] Failed to initialize observability system:', error);
      monitoringService.trackError({
        type: 'monitoring_init_error',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    }
  }

  async initializeCore() {
    // Set up connection monitoring
    this.trackNetworkStatus();
    
    // Set up performance observer
    this.setupPerformanceObserver();
    
    // Track initial page load
    this.trackInitialPageLoad();
  }

  setupUserTracking() {
    // Track user authentication state changes
    const authEventHandler = (event) => {
      if (event.detail.type === 'login') {
        monitoringService.setUser(event.detail.userId);
        businessMetricsService.trackUserCohort(event.detail.userId);
        businessMetricsService.updateUserSegment(event.detail.userId, {
          lastLogin: Date.now()
        });
        
        monitoringService.trackBusinessEvent('user_authenticated', {
          userId: event.detail.userId,
          method: event.detail.method || 'unknown'
        });
      } else if (event.detail.type === 'logout') {
        monitoringService.trackBusinessEvent('user_logged_out', {
          userId: event.detail.userId,
          sessionDuration: Date.now() - event.detail.sessionStart
        });
      }
    };

    document.addEventListener('auth-state-changed', authEventHandler);
  }

  setupBusinessTracking() {
    // Track financial events
    document.addEventListener('transaction-event', (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'created':
          businessMetricsService.trackTransaction({
            userId: data.userId,
            amount: data.amount,
            currency: data.currency,
            category: data.category,
            type: data.type,
            accountId: data.accountId,
            merchantName: data.merchantName,
            timestamp: Date.now()
          });
          break;
          
        case 'categorized':
          monitoringService.trackBusinessEvent('transaction_categorized', {
            userId: data.userId,
            transactionId: data.transactionId,
            oldCategory: data.oldCategory,
            newCategory: data.newCategory
          });
          break;
      }
    });

    // Track budget events
    document.addEventListener('budget-event', (event) => {
      const { type, data } = event.detail;
      
      businessMetricsService.trackBudgetEvent(type, {
        userId: data.userId,
        budgetId: data.budgetId,
        category: data.category,
        budgetAmount: data.budgetAmount,
        spentAmount: data.spentAmount,
        remainingAmount: data.remainingAmount,
        period: data.period
      });
    });

    // Track account connection events
    document.addEventListener('account-event', (event) => {
      const { type, data } = event.detail;
      
      if (type === 'connected') {
        businessMetricsService.trackAccountConnection({
          userId: data.userId,
          accountType: data.accountType,
          bankName: data.bankName,
          accountCount: data.accountCount
        });
      }
    });
  }

  setupPerformanceMonitoring() {
    // Track route changes and their performance
    const trackRouteChange = () => {
      const currentPath = window.location.pathname;
      const startTime = Date.now();
      
      // Track page view
      businessMetricsService.trackPageView(currentPath, this.getCurrentUserId(), {
        referrer: document.referrer,
        timestamp: startTime
      });
      
      // Measure time to interactive for new page
      setTimeout(() => {
        monitoringService.trackPerformance({
          type: 'route_change',
          path: currentPath,
          loadTime: Date.now() - startTime,
          timestamp: Date.now()
        });
      }, 100);
    };

    // Listen for route changes (works with React Router)
    let currentPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        trackRouteChange();
      }
    });

    observer.observe(document, { childList: true, subtree: true });
    
    // Track initial route
    trackRouteChange();
  }

  setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        monitoringService.trackPerformance({
          type: 'lcp',
          value: entry.startTime,
          element: entry.element?.tagName,
          timestamp: Date.now()
        });
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      
      monitoringService.trackPerformance({
        type: 'cls',
        value: clsValue,
        timestamp: Date.now()
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        monitoringService.trackPerformance({
          type: 'fid',
          value: entry.processingStart - entry.startTime,
          timestamp: Date.now()
        });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }

  setupErrorTracking() {
    // Global error handlers are already set up in monitoringService
    // Add React-specific error boundary integration
    
    // Track React component errors
    window.addEventListener('react-error', (event) => {
      const { error, errorInfo, componentStack } = event.detail;
      
      monitoringService.trackError({
        type: 'react_component_error',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: Date.now()
      });
    });
  }

  setupApiMonitoring() {
    // API monitoring is automatically set up by the apiMonitoring service
    // Add business-specific API tracking
    
    // Track Plaid API calls specifically
    document.addEventListener('plaid-api-call', (event) => {
      const { endpoint, success, duration, error } = event.detail;
      
      monitoringService.trackBusinessEvent('plaid_api_call', {
        endpoint,
        success,
        duration,
        error: error?.message,
        timestamp: Date.now()
      });
    });
  }

  setupPageLifecycleTracking() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      const eventType = document.hidden ? 'page_hidden' : 'page_visible';
      monitoringService.trackEvent('page_lifecycle', eventType, {
        timestamp: Date.now(),
        path: window.location.pathname
      });
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - monitoringService.startTime;
      monitoringService.trackEvent('session', 'session_end', {
        sessionDuration,
        timestamp: Date.now(),
        path: window.location.pathname
      });
    });
  }

  trackNetworkStatus() {
    const updateNetworkStatus = () => {
      monitoringService.trackEvent('network', 'status_change', {
        online: navigator.onLine,
        timestamp: Date.now(),
        connectionType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink
      });
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }

  trackInitialPageLoad() {
    // Track initial page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        monitoringService.trackPerformance({
          type: 'page_load',
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: navigation.responseEnd - navigation.requestStart,
          timestamp: Date.now()
        });
      }
    });
  }

  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.uid || null;
    } catch {
      return null;
    }
  }

  // Public methods for manual event tracking
  trackBusinessEvent(eventType, data) {
    const userId = this.getCurrentUserId();
    businessMetricsService.trackUserAction(userId, eventType, data);
  }

  trackFinancialEvent(eventType, data) {
    const userId = this.getCurrentUserId();
    businessMetricsService.trackFinancialEvent(eventType, {
      ...data,
      userId
    });
  }

  trackUserJourney(step, data = {}) {
    const userId = this.getCurrentUserId();
    businessMetricsService.trackUserAction(userId, `journey_${step}`, data);
  }

  // Configuration methods
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  enableFeature(feature, enabled = true) {
    this.config.enabledFeatures[feature] = enabled;
  }

  // Debugging methods for development
  getMonitoringStats() {
    return {
      initialized: this.initialized,
      config: this.config,
      recentEvents: monitoringService.metrics.userActions.slice(-10),
      errorCount: monitoringService.metrics.errors.length,
      performanceMetrics: monitoringService.metrics.performance.slice(-5)
    };
  }
}

// Create global instance
const monitoringInitializer = new MonitoringInitializer();

// Helper functions for React components
export const dispatchBusinessEvent = (eventType, data) => {
  document.dispatchEvent(new CustomEvent(`${eventType}-event`, { detail: data }));
};

export const trackPageInteraction = (elementId, action, metadata = {}) => {
  monitoringService.trackEvent('user_interaction', action, {
    elementId,
    path: window.location.pathname,
    timestamp: Date.now(),
    ...metadata
  });
};

export const trackFormSubmission = (formId, formData, success = true, errors = []) => {
  monitoringService.trackEvent('form_interaction', 'submit', {
    formId,
    fieldCount: Object.keys(formData).length,
    success,
    errorCount: errors.length,
    timestamp: Date.now()
  });
};

export const trackFeatureUsage = (featureName, action, metadata = {}) => {
  monitoringService.trackEvent('feature_usage', action, {
    feature: featureName,
    timestamp: Date.now(),
    ...metadata
  });
};

// Export the initializer
export default monitoringInitializer;

// Auto-initialize when imported (can be disabled by setting VITE_AUTO_INIT_MONITORING=false)
if (import.meta.env.VITE_AUTO_INIT_MONITORING !== 'false') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitoringInitializer.initialize();
    });
  } else {
    monitoringInitializer.initialize();
  }
}