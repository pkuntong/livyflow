import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';

// Lazy image component with loading states
export function LazyImage({ src, alt, className = '', fallback, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
      if (imgRef.current) {
        imgRef.current.classList.add('loaded');
      }
    };
    img.onerror = () => setHasError(true);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (hasError) {
    return fallback || (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <span className="text-gray-400 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <div className={`skeleton absolute inset-0 rounded ${className}`} />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        loading="lazy"
        {...props}
      />
    </div>
  );
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!targetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [hasIntersected, options]);

  return [targetRef, isIntersecting, hasIntersected];
}

// Lazy component wrapper
export function LazyComponent({ children, fallback, className = '' }) {
  const [targetRef, isIntersecting, hasIntersected] = useIntersectionObserver();

  return (
    <div ref={targetRef} className={className}>
      {hasIntersected ? (
        children
      ) : (
        fallback || (
          <div className={`skeleton h-48 rounded-lg ${className}`} />
        )
      )}
    </div>
  );
}

// Loading skeleton component
export function LoadingSkeleton({ className = '', count = 1 }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`skeleton h-4 rounded ${className}`} />
      ))}
    </div>
  );
}

// Chart loading skeleton
export function ChartSkeleton({ className = '' }) {
  return (
    <div className={`skeleton h-64 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${className}`}>
      <div className="p-6 h-full flex flex-col justify-between">
        <div className="skeleton h-4 w-32 rounded mb-4" />
        <div className="flex items-end justify-between h-32 space-x-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-t"
              style={{
                height: `${Math.random() * 80 + 20}%`,
                width: '100%'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Card loading skeleton
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-8 w-8 rounded-full" />
        </div>
        <div className="skeleton h-8 w-20 rounded mb-2" />
        <div className="skeleton h-4 w-24 rounded" />
      </div>
    </div>
  );
}

// Transaction item skeleton
export function TransactionSkeleton({ count = 3, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div>
              <div className="skeleton h-4 w-32 rounded mb-2" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          </div>
          <div className="text-right">
            <div className="skeleton h-4 w-16 rounded mb-2" />
            <div className="skeleton h-3 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 100) {
        console.warn(`Slow component render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}

// Lazy load Routes
export const LazyDashboard = lazy(() => import('../Pages/Dashboard'));
export const LazyTransactions = lazy(() => import('../Pages/Transactions'));
export const LazyBudgets = lazy(() => import('../Pages/Budgets'));
export const LazyReports = lazy(() => import('../Pages/Reports'));
export const LazyAccounts = lazy(() => import('../Pages/Accounts'));
export const LazyAnalytics = lazy(() => import('../Pages/Analytics'));
export const LazySettings = lazy(() => import('../Pages/Settings'));

// Lazy load heavy components
export const LazySpendingChart = lazy(() => import('../components/dashboard/SpendingTrendsChart'));
export const LazyBudgetCharts = lazy(() => import('../components/budgets/BudgetCharts'));

// Error boundary for lazy components
export class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-4">Failed to load this section. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Suspense wrapper with loading state
export function SuspenseWrapper({ children, fallback }) {
  return (
    <LazyErrorBoundary>
      <Suspense 
        fallback={
          fallback || (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          )
        }
      >
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
}