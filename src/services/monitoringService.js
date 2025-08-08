/**
 * Frontend Monitoring Service
 * Provides comprehensive monitoring for performance, errors, user behavior, and business metrics
 */

class MonitoringService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.metrics = {
      performance: [],
      errors: [],
      userActions: [],
      businessEvents: [],
      pageViews: [],
      apiCalls: []
    };
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
    this.setupPerformanceObserver();
    this.startHeartbeat();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setupEventListeners() {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.trackEvent('network', 'connection_restored', { timestamp: Date.now() });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.trackEvent('network', 'connection_lost', { timestamp: Date.now() });
    });

    // Unhandled error tracking
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Promise rejection tracking
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href
      });
    });

    // Page visibility for session tracking
    document.addEventListener('visibilitychange', () => {
      const eventType = document.hidden ? 'page_hidden' : 'page_visible';
      this.trackEvent('page_visibility', eventType, {
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.startTime
      });
    });

    // Before unload for session end
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session', 'session_end', {
        sessionDuration: Date.now() - this.startTime,
        timestamp: Date.now()
      });
      this.flush(); // Send any pending metrics
    });
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.trackPerformance({
              type: 'navigation',
              url: entry.name,
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              firstPaint: entry.responseEnd - entry.requestStart,
              dnsDuration: entry.domainLookupEnd - entry.domainLookupStart,
              tcpDuration: entry.connectEnd - entry.connectStart,
              requestDuration: entry.responseEnd - entry.requestStart,
              timestamp: Date.now()
            });
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Resource timing for API calls and assets
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('/api/')) {
            this.trackApiCall({
              url: entry.name,
              method: 'GET', // Default, will be overridden by interceptor
              duration: entry.responseEnd - entry.requestStart,
              size: entry.transferSize,
              timestamp: Date.now()
            });
          } else {
            this.trackPerformance({
              type: 'resource',
              name: entry.name,
              duration: entry.responseEnd - entry.requestStart,
              size: entry.transferSize,
              resourceType: entry.initiatorType,
              timestamp: Date.now()
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackPerformance({
            type: 'lcp',
            value: entry.startTime,
            element: entry.element?.tagName,
            url: entry.url,
            timestamp: Date.now()
          });
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackPerformance({
            type: 'fid',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now()
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    }
  }

  // Core tracking methods
  trackError(errorData) {
    const error = {
      ...errorData,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      severity: this.determineSeverity(errorData),
      context: this.getContext()
    };
    
    this.metrics.errors.push(error);
    console.error('[Monitoring] Error tracked:', error);
    
    // Send critical errors immediately
    if (error.severity === 'critical') {
      this.sendMetrics([error], 'error');
    }
  }

  trackPerformance(performanceData) {
    const performance = {
      ...performanceData,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      context: this.getContext()
    };
    
    this.metrics.performance.push(performance);
    
    // Alert on poor performance
    if (performanceData.type === 'navigation' && performanceData.loadComplete > 5000) {
      this.trackEvent('performance_alert', 'slow_page_load', {
        duration: performanceData.loadComplete,
        url: performanceData.url
      });
    }
  }

  trackEvent(category, action, properties = {}) {
    const event = {
      category,
      action,
      properties,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      timestamp: Date.now(),
      url: window.location.href,
      context: this.getContext()
    };
    
    this.metrics.userActions.push(event);
  }

  trackBusinessEvent(eventType, eventData) {
    const businessEvent = {
      type: eventType,
      data: eventData,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      timestamp: Date.now(),
      context: this.getContext()
    };
    
    this.metrics.businessEvents.push(businessEvent);
    
    // Business events are important, send immediately for critical ones
    if (['transaction_created', 'budget_exceeded', 'account_connected'].includes(eventType)) {
      this.sendMetrics([businessEvent], 'business_event');
    }
  }

  trackPageView(pageName, properties = {}) {
    const pageView = {
      page: pageName,
      properties,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      timestamp: Date.now(),
      url: window.location.href,
      referrer: document.referrer,
      context: this.getContext()
    };
    
    this.metrics.pageViews.push(pageView);
  }

  trackApiCall(apiData) {
    const apiCall = {
      ...apiData,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      context: this.getContext()
    };
    
    this.metrics.apiCalls.push(apiCall);
    
    // Track API errors and slow responses
    if (apiData.status >= 400) {
      this.trackError({
        type: 'api_error',
        message: `API Error: ${apiData.status}`,
        url: apiData.url,
        method: apiData.method,
        status: apiData.status,
        timestamp: Date.now()
      });
    } else if (apiData.duration > 10000) {
      this.trackEvent('performance_alert', 'slow_api_call', {
        url: apiData.url,
        duration: apiData.duration
      });
    }
  }

  // Business-specific tracking methods
  trackFinancialEvent(eventType, data) {
    this.trackBusinessEvent(`financial_${eventType}`, {
      ...data,
      amount: data.amount,
      currency: data.currency || 'USD',
      category: data.category
    });
  }

  trackUserJourney(step, data = {}) {
    this.trackEvent('user_journey', step, {
      ...data,
      journeyStep: step,
      sessionDuration: Date.now() - this.startTime
    });
  }

  // Helper methods
  determineSeverity(errorData) {
    if (errorData.type === 'api_error' && errorData.status >= 500) return 'critical';
    if (errorData.type === 'javascript_error' && errorData.message?.includes('ChunkLoadError')) return 'high';
    if (errorData.type === 'unhandled_promise_rejection') return 'medium';
    return 'low';
  }

  getContext() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height
      },
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink
      } : null,
      memory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
      online: this.isOnline,
      language: navigator.language,
      platform: navigator.platform
    };
  }

  getUserId() {
    // Get user ID from auth context or localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.uid || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // Batch sending and heartbeat
  startHeartbeat() {
    // Send metrics every 30 seconds
    setInterval(() => {
      this.sendBatchMetrics();
    }, 30000);

    // Send heartbeat every 5 minutes
    setInterval(() => {
      this.trackEvent('system', 'heartbeat', {
        sessionDuration: Date.now() - this.startTime,
        metricsCount: Object.values(this.metrics).reduce((sum, arr) => sum + arr.length, 0)
      });
    }, 300000);
  }

  sendBatchMetrics() {
    if (this.hasMetricsToSend()) {
      const payload = {
        sessionId: this.sessionId,
        userId: this.getUserId(),
        timestamp: Date.now(),
        metrics: { ...this.metrics }
      };
      
      this.sendMetrics(payload, 'batch');
      this.clearMetrics();
    }
  }

  hasMetricsToSend() {
    return Object.values(this.metrics).some(arr => arr.length > 0);
  }

  clearMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
  }

  async sendMetrics(data, type) {
    if (!this.isOnline) {
      this.storeOfflineMetrics(data);
      return;
    }

    try {
      const response = await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send metrics: ${response.status}`);
      }
    } catch (error) {
      console.error('[Monitoring] Failed to send metrics:', error);
      this.storeOfflineMetrics(data);
    }
  }

  storeOfflineMetrics(data) {
    try {
      const offlineMetrics = JSON.parse(localStorage.getItem('offline_metrics') || '[]');
      offlineMetrics.push({
        data,
        timestamp: Date.now()
      });
      
      // Keep only last 100 offline metrics
      if (offlineMetrics.length > 100) {
        offlineMetrics.splice(0, offlineMetrics.length - 100);
      }
      
      localStorage.setItem('offline_metrics', JSON.stringify(offlineMetrics));
    } catch (error) {
      console.error('[Monitoring] Failed to store offline metrics:', error);
    }
  }

  async sendOfflineMetrics() {
    try {
      const offlineMetrics = JSON.parse(localStorage.getItem('offline_metrics') || '[]');
      if (offlineMetrics.length === 0) return;

      for (const metric of offlineMetrics) {
        await this.sendMetrics(metric.data, 'offline_sync');
      }

      localStorage.removeItem('offline_metrics');
    } catch (error) {
      console.error('[Monitoring] Failed to sync offline metrics:', error);
    }
  }

  flush() {
    if (this.hasMetricsToSend()) {
      // Use sendBeacon for reliable sending during page unload
      if (navigator.sendBeacon) {
        const payload = JSON.stringify({
          sessionId: this.sessionId,
          userId: this.getUserId(),
          timestamp: Date.now(),
          metrics: { ...this.metrics }
        });
        
        navigator.sendBeacon('/api/monitoring/metrics', payload);
      } else {
        this.sendBatchMetrics();
      }
    }
  }

  // Public API for manual tracking
  setUser(userId) {
    this.userId = userId;
  }

  addCustomMetric(name, value, tags = {}) {
    this.trackEvent('custom_metric', name, {
      value,
      tags,
      timestamp: Date.now()
    });
  }

  startTimer(name) {
    const startTime = Date.now();
    return {
      stop: (tags = {}) => {
        const duration = Date.now() - startTime;
        this.trackEvent('timer', name, {
          duration,
          tags,
          timestamp: Date.now()
        });
        return duration;
      }
    };
  }

  // Real User Monitoring (RUM) methods
  measureWebVitals() {
    if ('PerformanceObserver' in window) {
      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        
        this.trackPerformance({
          type: 'cls',
          value: clsValue,
          timestamp: Date.now()
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // Monitor memory usage if available
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.trackPerformance({
          type: 'memory',
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }, 60000); // Every minute
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Initialize web vitals monitoring
monitoringService.measureWebVitals();

export default monitoringService;