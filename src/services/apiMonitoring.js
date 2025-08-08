/**
 * API Monitoring Service
 * Intercepts and monitors all API calls for performance, errors, and usage analytics
 */

import monitoringService from './monitoringService.js';

class ApiMonitoringService {
  constructor() {
    this.originalFetch = window.fetch;
    this.setupFetchInterceptor();
    this.setupAxiosInterceptor();
  }

  setupFetchInterceptor() {
    window.fetch = async (url, options = {}) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      const requestData = {
        id: requestId,
        url: typeof url === 'string' ? url : url.url,
        method: options.method || 'GET',
        headers: options.headers,
        startTime,
        userAgent: navigator.userAgent
      };

      try {
        // Track request start
        monitoringService.trackEvent('api', 'request_start', {
          requestId,
          url: requestData.url,
          method: requestData.method
        });

        const response = await this.originalFetch(url, options);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Track successful response
        const responseData = {
          ...requestData,
          status: response.status,
          statusText: response.statusText,
          duration,
          endTime,
          success: response.ok,
          responseSize: this.getResponseSize(response)
        };

        this.trackApiCall(responseData);
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Track failed request
        const errorData = {
          ...requestData,
          duration,
          endTime,
          success: false,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        };

        this.trackApiCall(errorData);
        monitoringService.trackError({
          type: 'api_network_error',
          message: `Network error for ${requestData.url}: ${error.message}`,
          url: requestData.url,
          method: requestData.method,
          requestId,
          timestamp: Date.now()
        });

        throw error;
      }
    };
  }

  setupAxiosInterceptor() {
    // Check if axios is available
    if (typeof window !== 'undefined' && window.axios) {
      // Request interceptor
      window.axios.interceptors.request.use(
        (config) => {
          const requestId = this.generateRequestId();
          config.metadata = {
            requestId,
            startTime: Date.now()
          };
          
          monitoringService.trackEvent('api', 'axios_request_start', {
            requestId,
            url: config.url,
            method: config.method?.toUpperCase(),
            baseURL: config.baseURL
          });
          
          return config;
        },
        (error) => {
          monitoringService.trackError({
            type: 'axios_request_error',
            message: `Axios request setup error: ${error.message}`,
            timestamp: Date.now()
          });
          return Promise.reject(error);
        }
      );

      // Response interceptor
      window.axios.interceptors.response.use(
        (response) => {
          const { config } = response;
          const endTime = Date.now();
          const duration = config.metadata ? endTime - config.metadata.startTime : 0;
          
          const responseData = {
            id: config.metadata?.requestId,
            url: this.buildFullUrl(config),
            method: config.method?.toUpperCase(),
            status: response.status,
            statusText: response.statusText,
            duration,
            success: true,
            responseSize: this.calculateDataSize(response.data),
            requestSize: this.calculateDataSize(config.data)
          };
          
          this.trackApiCall(responseData);
          return response;
        },
        (error) => {
          const { config } = error;
          const endTime = Date.now();
          const duration = config?.metadata ? endTime - config.metadata.startTime : 0;
          
          const errorData = {
            id: config?.metadata?.requestId,
            url: config ? this.buildFullUrl(config) : 'unknown',
            method: config?.method?.toUpperCase(),
            status: error.response?.status,
            statusText: error.response?.statusText,
            duration,
            success: false,
            error: {
              name: error.name,
              message: error.message,
              code: error.code,
              stack: error.stack
            }
          };
          
          this.trackApiCall(errorData);
          
          // Track specific error types
          if (error.code === 'ECONNABORTED') {
            monitoringService.trackEvent('api', 'timeout', {
              url: errorData.url,
              timeout: config?.timeout,
              duration
            });
          } else if (error.response?.status >= 500) {
            monitoringService.trackEvent('api', 'server_error', {
              url: errorData.url,
              status: error.response.status,
              method: errorData.method
            });
          } else if (error.response?.status >= 400) {
            monitoringService.trackEvent('api', 'client_error', {
              url: errorData.url,
              status: error.response.status,
              method: errorData.method
            });
          }
          
          return Promise.reject(error);
        }
      );
    }
  }

  trackApiCall(data) {
    monitoringService.trackApiCall(data);
    
    // Track business-specific API patterns
    this.trackBusinessApiPatterns(data);
    
    // Alert on performance issues
    if (data.duration > 5000) {
      monitoringService.trackEvent('performance_alert', 'slow_api_call', {
        url: data.url,
        duration: data.duration,
        method: data.method
      });
    }
    
    // Track error patterns
    if (!data.success) {
      this.trackErrorPatterns(data);
    }
  }

  trackBusinessApiPatterns(data) {
    const url = data.url.toLowerCase();
    
    // Plaid API tracking
    if (url.includes('plaid')) {
      monitoringService.trackBusinessEvent('plaid_api_call', {
        endpoint: this.extractEndpoint(url),
        duration: data.duration,
        success: data.success,
        status: data.status
      });
    }
    
    // Budget operations
    if (url.includes('budget')) {
      monitoringService.trackBusinessEvent('budget_operation', {
        operation: this.inferOperation(data.method, url),
        duration: data.duration,
        success: data.success
      });
    }
    
    // Transaction operations
    if (url.includes('transaction')) {
      monitoringService.trackBusinessEvent('transaction_operation', {
        operation: this.inferOperation(data.method, url),
        duration: data.duration,
        success: data.success
      });
    }
    
    // Authentication tracking
    if (url.includes('auth') || url.includes('login') || url.includes('signup')) {
      monitoringService.trackBusinessEvent('auth_operation', {
        operation: this.inferOperation(data.method, url),
        duration: data.duration,
        success: data.success,
        status: data.status
      });
    }
  }

  trackErrorPatterns(data) {
    const patterns = {
      '401': 'authentication_error',
      '403': 'authorization_error',
      '404': 'not_found_error',
      '429': 'rate_limit_error',
      '500': 'server_error',
      '502': 'bad_gateway',
      '503': 'service_unavailable',
      '504': 'gateway_timeout'
    };
    
    const pattern = patterns[data.status?.toString()] || 'unknown_error';
    
    monitoringService.trackEvent('api_error_pattern', pattern, {
      url: data.url,
      method: data.method,
      status: data.status,
      duration: data.duration,
      userAgent: navigator.userAgent
    });
  }

  // Helper methods
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getResponseSize(response) {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  }

  calculateDataSize(data) {
    if (!data) return 0;
    if (typeof data === 'string') return new Blob([data]).size;
    if (typeof data === 'object') return new Blob([JSON.stringify(data)]).size;
    return 0;
  }

  buildFullUrl(config) {
    const baseURL = config.baseURL || '';
    const url = config.url || '';
    return baseURL + url;
  }

  extractEndpoint(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').filter(Boolean).join('/');
    } catch {
      return url;
    }
  }

  inferOperation(method, url) {
    const path = url.toLowerCase();
    switch (method?.toUpperCase()) {
      case 'GET':
        return path.includes('list') || path.endsWith('s') ? 'list' : 'get';
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'unknown';
    }
  }

  // API health monitoring
  startApiHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  async performHealthCheck() {
    const healthEndpoints = [
      '/api/health',
      '/api/status'
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint, {
          method: 'GET',
          timeout: 5000
        });
        const duration = Date.now() - startTime;

        monitoringService.trackEvent('health_check', 'api_health', {
          endpoint,
          status: response.status,
          duration,
          success: response.ok,
          timestamp: Date.now()
        });
      } catch (error) {
        monitoringService.trackError({
          type: 'health_check_failed',
          message: `Health check failed for ${endpoint}: ${error.message}`,
          endpoint,
          timestamp: Date.now()
        });
      }
    }
  }

  // SLA monitoring
  trackSLA(endpoint, responseTime, errorRate) {
    const slaThresholds = {
      '/api/auth': { responseTime: 2000, errorRate: 0.01 },
      '/api/transactions': { responseTime: 3000, errorRate: 0.05 },
      '/api/budgets': { responseTime: 2000, errorRate: 0.02 },
      '/api/plaid': { responseTime: 5000, errorRate: 0.10 }
    };

    const threshold = slaThresholds[endpoint];
    if (!threshold) return;

    const violations = [];
    
    if (responseTime > threshold.responseTime) {
      violations.push('response_time');
    }
    
    if (errorRate > threshold.errorRate) {
      violations.push('error_rate');
    }

    if (violations.length > 0) {
      monitoringService.trackEvent('sla_violation', 'threshold_exceeded', {
        endpoint,
        violations,
        responseTime,
        errorRate,
        thresholds: threshold,
        severity: violations.length > 1 ? 'high' : 'medium'
      });
    }
  }
}

// Initialize API monitoring
const apiMonitoringService = new ApiMonitoringService();
apiMonitoringService.startApiHealthMonitoring();

export default apiMonitoringService;