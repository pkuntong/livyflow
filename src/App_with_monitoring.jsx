import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './Landing'
import SignUp from './Pages/SignUp'
import Login from './Pages/Login'
import { 
  LazyDashboard, 
  LazyTransactions, 
  LazyBudgets, 
  LazyReports, 
  LazyAccounts, 
  LazyAnalytics, 
  LazySettings,
  SuspenseWrapper,
  CardSkeleton
} from './utils/lazyLoading'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { StagewiseToolbar } from '@stagewise/toolbar-react'
import ReactPlugin from '@stagewise-plugins/react'

// Observability imports
import ErrorBoundary from './components/ErrorBoundary'
import MonitoringDashboard from './components/MonitoringDashboard'
import monitoringInitializer, { dispatchBusinessEvent, trackPageInteraction } from './utils/initializeMonitoring'
import { useMonitoring } from './hooks/useMonitoring'

// Protected Route component with monitoring
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const { trackUserJourney } = useMonitoring();
  
  React.useEffect(() => {
    if (user) {
      // Track authenticated access
      trackUserJourney('protected_route_accessed', {
        userId: user.uid,
        path: window.location.pathname
      });
    }
  }, [user, trackUserJourney]);
  
  if (!user) {
    // Track unauthorized access attempt
    trackUserJourney('unauthorized_access_attempt', {
      path: window.location.pathname,
      redirectedTo: '/login'
    });
    return <Navigate to="/login" />;
  }
  
  return children;
}

// Enhanced Routes component with monitoring
function AppRoutes() {
  const { trackEvent } = useMonitoring();
  
  // Track route changes
  React.useEffect(() => {
    const handleRouteChange = () => {
      trackEvent('navigation', 'route_change', {
        path: window.location.pathname,
        timestamp: Date.now()
      });
    };
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [trackEvent]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={
        <ErrorBoundary name="SignUpPage">
          <SignUp />
        </ErrorBoundary>
      } />
      <Route path="/login" element={
        <ErrorBoundary name="LoginPage">
          <Login />
        </ErrorBoundary>
      } />
      
      {/* Protected App Routes with Enhanced Error Boundaries */}
      <Route path="/app" element={
        <ProtectedRoute>
          <ErrorBoundary name="MainAppLayout">
            <Layout />
          </ErrorBoundary>
        </ProtectedRoute>
      }>
        <Route index element={
          <ErrorBoundary name="Dashboard">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyDashboard />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="dashboard" element={
          <ErrorBoundary name="Dashboard">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyDashboard />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="transactions" element={
          <ErrorBoundary name="Transactions">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyTransactions />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="budgets" element={
          <ErrorBoundary name="Budgets">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyBudgets />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="reports" element={
          <ErrorBoundary name="Reports">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyReports />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="accounts" element={
          <ErrorBoundary name="Accounts">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyAccounts />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="analytics" element={
          <ErrorBoundary name="Analytics">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazyAnalytics />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        <Route path="settings" element={
          <ErrorBoundary name="Settings">
            <SuspenseWrapper fallback={<CardSkeleton />}>
              <LazySettings />
            </SuspenseWrapper>
          </ErrorBoundary>
        } />
        
        {/* Monitoring Dashboard - only in development */}
        {import.meta.env.MODE === 'development' && (
          <Route path="monitoring" element={
            <ErrorBoundary name="MonitoringDashboard">
              <MonitoringDashboard />
            </ErrorBoundary>
          } />
        )}
      </Route>
    </Routes>
  )
}

// Enhanced Auth Provider with monitoring integration
function AuthProviderWithMonitoring({ children }) {
  return (
    <AuthProvider>
      <AuthMonitoringWrapper>
        {children}
      </AuthMonitoringWrapper>
    </AuthProvider>
  );
}

// Component to monitor auth state changes
function AuthMonitoringWrapper({ children }) {
  const { user } = useAuth();
  const { trackBusinessEvent, trackUserJourney } = useMonitoring();
  
  React.useEffect(() => {
    if (user) {
      // Track user login
      trackBusinessEvent('user_authenticated', {
        userId: user.uid,
        loginMethod: 'firebase_auth',
        timestamp: Date.now()
      });
      
      trackUserJourney('authentication_completed', {
        userId: user.uid
      });
      
      // Dispatch auth event for other monitoring components
      dispatchBusinessEvent('auth', {
        type: 'login',
        userId: user.uid,
        sessionStart: Date.now()
      });
      
      // Update monitoring service with user info
      monitoringInitializer.setConfig({
        userId: user.uid
      });
      
    } else {
      // Track user logout (if previously logged in)
      trackBusinessEvent('user_logged_out', {
        timestamp: Date.now()
      });
      
      dispatchBusinessEvent('auth', {
        type: 'logout'
      });
    }
  }, [user, trackBusinessEvent, trackUserJourney]);
  
  return children;
}

// Main App component with comprehensive error boundary
function App() {
  const { trackEvent } = useMonitoring();
  
  // Track app initialization
  React.useEffect(() => {
    trackEvent('app', 'initialized', {
      environment: import.meta.env.MODE,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
    
    // Track any uncaught promise rejections
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Track with monitoring
      trackEvent('error', 'unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        timestamp: Date.now()
      });
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackEvent]);
  
  const handleGlobalError = (error, errorInfo) => {
    console.error('Global error caught by App error boundary:', error);
    
    // Track with monitoring
    trackEvent('error', 'global_app_error', {
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo?.componentStack,
      timestamp: Date.now()
    });
  };
  
  return (
    <ErrorBoundary 
      name="GlobalAppBoundary" 
      onError={handleGlobalError}
      fallback={(error, errorInfo, retry, errorId) => (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Application Error</h2>
            <p className="text-sm text-gray-500 mb-6">
              We're sorry, but something went wrong. Our team has been notified and is working on a fix.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={retry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Reload App
              </button>
            </div>
            {errorId && (
              <p className="text-xs text-gray-400 mt-4">Error ID: {errorId}</p>
            )}
          </div>
        </div>
      )}
    >
      {/* Stagewise Toolbar (only shows in dev mode) */}
      <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
      
      <Router>
        <AuthProviderWithMonitoring>
          <AppRoutes />
        </AuthProviderWithMonitoring>
      </Router>
    </ErrorBoundary>
  );
}

export default App