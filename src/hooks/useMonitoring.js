/**
 * React Hook for Monitoring Integration
 * Provides easy-to-use monitoring capabilities for React components
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import monitoringService from '../services/monitoringService.js';

export const useMonitoring = () => {
  const location = useLocation();
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(Date.now());

  // Track page views automatically
  useEffect(() => {
    const pageName = location.pathname.replace('/app/', '') || 'dashboard';
    monitoringService.trackPageView(pageName, {
      search: location.search,
      hash: location.hash,
      referrer: document.referrer
    });
  }, [location]);

  // Track component renders
  useEffect(() => {
    renderCountRef.current += 1;
  });

  // Track component lifecycle
  useEffect(() => {
    const componentName = useMonitoring.caller?.name || 'unknown';
    const mountTime = Date.now();
    mountTimeRef.current = mountTime;

    // Track component mount
    monitoringService.trackEvent('component', 'mounted', {
      componentName,
      path: location.pathname,
      mountTime
    });

    return () => {
      // Track component unmount
      const unmountTime = Date.now();
      const lifetimeDuration = unmountTime - mountTimeRef.current;
      
      monitoringService.trackEvent('component', 'unmounted', {
        componentName,
        path: location.pathname,
        lifetimeDuration,
        renderCount: renderCountRef.current,
        unmountTime
      });
    };
  }, [location.pathname]);

  // Tracking functions
  const trackEvent = useCallback((category, action, properties = {}) => {
    monitoringService.trackEvent(category, action, {
      ...properties,
      path: location.pathname
    });
  }, [location.pathname]);

  const trackError = useCallback((error, context = {}) => {
    monitoringService.trackError({
      type: 'react_error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      componentPath: location.pathname,
      ...context,
      timestamp: Date.now()
    });
  }, [location.pathname]);

  const trackBusinessEvent = useCallback((eventType, eventData) => {
    monitoringService.trackBusinessEvent(eventType, {
      ...eventData,
      path: location.pathname
    });
  }, [location.pathname]);

  const trackUserJourney = useCallback((step, data = {}) => {
    monitoringService.trackUserJourney(step, {
      ...data,
      path: location.pathname
    });
  }, [location.pathname]);

  const trackFinancialEvent = useCallback((eventType, data) => {
    monitoringService.trackFinancialEvent(eventType, {
      ...data,
      path: location.pathname
    });
  }, [location.pathname]);

  const startTimer = useCallback((name) => {
    return monitoringService.startTimer(`${location.pathname}_${name}`);
  }, [location.pathname]);

  const trackInteraction = useCallback((elementType, elementId, action) => {
    trackEvent('interaction', action, {
      elementType,
      elementId,
      timestamp: Date.now()
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackError,
    trackBusinessEvent,
    trackUserJourney,
    trackFinancialEvent,
    startTimer,
    trackInteraction
  };
};

// Higher-order component for automatic error tracking
export const withMonitoring = (Component, componentName) => {
  return function MonitoredComponent(props) {
    const { trackError } = useMonitoring();
    
    const errorHandler = useCallback((error, errorInfo) => {
      trackError(error, {
        componentName,
        errorInfo: errorInfo?.componentStack,
        props: JSON.stringify(props, null, 2).substring(0, 1000) // Limit props size
      });
    }, [trackError, props]);

    // Use React Error Boundary pattern
    useEffect(() => {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const error = args[0];
        if (error instanceof Error) {
          errorHandler(error, { source: 'console.error' });
        }
        originalConsoleError.apply(console, args);
      };

      return () => {
        console.error = originalConsoleError;
      };
    }, [errorHandler]);

    return <Component {...props} />;
  };
};

// Hook for performance monitoring
export const usePerformanceMonitoring = (componentName) => {
  const renderStartTime = useRef(Date.now());
  const previousRenderTime = useRef(0);

  useEffect(() => {
    const renderEndTime = Date.now();
    const renderDuration = renderEndTime - renderStartTime.current;
    
    // Track slow renders
    if (renderDuration > 100) { // More than 100ms
      monitoringService.trackPerformance({
        type: 'slow_render',
        componentName,
        duration: renderDuration,
        previousRenderTime: previousRenderTime.current,
        timestamp: Date.now()
      });
    }

    previousRenderTime.current = renderDuration;
    renderStartTime.current = Date.now();
  });

  const measureOperation = useCallback((operationName, operation) => {
    const startTime = Date.now();
    
    if (operation instanceof Promise) {
      return operation.finally(() => {
        const duration = Date.now() - startTime;
        monitoringService.trackPerformance({
          type: 'async_operation',
          componentName,
          operationName,
          duration,
          timestamp: Date.now()
        });
      });
    } else {
      try {
        const result = operation();
        const duration = Date.now() - startTime;
        
        monitoringService.trackPerformance({
          type: 'sync_operation',
          componentName,
          operationName,
          duration,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        monitoringService.trackPerformance({
          type: 'failed_operation',
          componentName,
          operationName,
          duration,
          error: error.message,
          timestamp: Date.now()
        });
        
        throw error;
      }
    }
  }, [componentName]);

  return { measureOperation };
};

// Hook for user behavior tracking
export const useUserBehavior = () => {
  const { trackEvent } = useMonitoring();
  const sessionStartTime = useRef(Date.now());
  const lastInteractionTime = useRef(Date.now());
  const interactionCount = useRef(0);

  const trackClick = useCallback((elementId, elementType = 'button', metadata = {}) => {
    interactionCount.current += 1;
    lastInteractionTime.current = Date.now();
    
    trackEvent('user_interaction', 'click', {
      elementId,
      elementType,
      interactionCount: interactionCount.current,
      sessionDuration: Date.now() - sessionStartTime.current,
      ...metadata
    });
  }, [trackEvent]);

  const trackFormSubmission = useCallback((formId, formData, validationErrors = []) => {
    trackEvent('user_interaction', 'form_submit', {
      formId,
      fieldCount: Object.keys(formData).length,
      hasErrors: validationErrors.length > 0,
      errorCount: validationErrors.length,
      errors: validationErrors.slice(0, 10), // Limit error details
      sessionDuration: Date.now() - sessionStartTime.current
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query, resultCount, filters = {}) => {
    trackEvent('user_interaction', 'search', {
      query: query.substring(0, 100), // Limit query length
      resultCount,
      hasFilters: Object.keys(filters).length > 0,
      filters,
      sessionDuration: Date.now() - sessionStartTime.current
    });
  }, [trackEvent]);

  const trackScroll = useCallback((scrollDepth, pageHeight) => {
    const scrollPercentage = Math.round((scrollDepth / pageHeight) * 100);
    
    // Only track significant scroll milestones
    if (scrollPercentage % 25 === 0 && scrollPercentage > 0) {
      trackEvent('user_interaction', 'scroll', {
        scrollPercentage,
        scrollDepth,
        pageHeight,
        sessionDuration: Date.now() - sessionStartTime.current
      });
    }
  }, [trackEvent]);

  const trackTimeOnPage = useCallback((pageName) => {
    const timeOnPage = Date.now() - lastInteractionTime.current;
    
    trackEvent('user_behavior', 'time_on_page', {
      pageName,
      timeOnPage,
      interactionCount: interactionCount.current,
      sessionDuration: Date.now() - sessionStartTime.current
    });
  }, [trackEvent]);

  return {
    trackClick,
    trackFormSubmission,
    trackSearch,
    trackScroll,
    trackTimeOnPage
  };
};

// Custom hook for A/B testing and feature flags
export const useExperimentTracking = () => {
  const { trackEvent } = useMonitoring();

  const trackExperiment = useCallback((experimentName, variant, metadata = {}) => {
    trackEvent('experiment', 'exposure', {
      experimentName,
      variant,
      ...metadata,
      timestamp: Date.now()
    });
  }, [trackEvent]);

  const trackConversion = useCallback((experimentName, variant, conversionType, value = null) => {
    trackEvent('experiment', 'conversion', {
      experimentName,
      variant,
      conversionType,
      value,
      timestamp: Date.now()
    });
  }, [trackEvent]);

  const trackFeatureUsage = useCallback((featureName, action, metadata = {}) => {
    trackEvent('feature_usage', action, {
      featureName,
      ...metadata,
      timestamp: Date.now()
    });
  }, [trackEvent]);

  return {
    trackExperiment,
    trackConversion,
    trackFeatureUsage
  };
};