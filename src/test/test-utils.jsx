import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { vi } from 'vitest'

// Mock AuthContext for testing
const MockAuthProvider = ({ children, value }) => {
  const defaultValue = {
    user: null,
    currentUser: null,
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => 'mock-token'),
    ...value,
  }

  return (
    <div data-testid="mock-auth-provider">
      {React.cloneElement(children, { authContext: defaultValue })}
    </div>
  )
}

// Custom render function that includes providers
function render(ui, { 
  route = '/',
  authValue = {},
  renderOptions = {},
} = {}) {
  // Set initial route
  window.history.pushState({}, 'Test page', route)

  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <MockAuthProvider value={authValue}>
        {children}
      </MockAuthProvider>
    </BrowserRouter>
  )

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

// Render function for authenticated components
function renderWithAuth(ui, { 
  user = global.mockUser,
  route = '/',
  renderOptions = {},
} = {}) {
  const authValue = {
    user,
    currentUser: user,
    getAuthToken: vi.fn(() => Promise.resolve('mock-token-123')),
  }

  return render(ui, { route, authValue, renderOptions })
}

// Render function for unauthenticated components
function renderWithoutAuth(ui, options = {}) {
  const authValue = {
    user: null,
    currentUser: null,
    getAuthToken: vi.fn(() => Promise.resolve(null)),
  }

  return render(ui, { ...options, authValue })
}

// Mock implementations for common services
export const mockBudgetService = {
  createBudget: vi.fn(),
  getBudgets: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  getSpendingSummary: vi.fn(),
  getBudgetSuggestions: vi.fn(),
}

export const mockPlaidService = {
  getLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  checkBackendHealth: vi.fn(),
}

// Utility function to create mock API responses
export const createMockResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
})

// Utility function to create mock API errors
export const createMockError = (message, status = 500, data = null) => {
  const error = new Error(message)
  error.response = {
    status,
    data,
    statusText: status === 401 ? 'Unauthorized' : 'Internal Server Error',
  }
  return error
}

// Wait for async operations to complete
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock Firebase user
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  getIdToken: vi.fn(() => Promise.resolve('mock-token-123')),
  ...overrides,
})

// Mock budget data
export const createMockBudget = (overrides = {}) => ({
  id: 'budget-123',
  name: 'Test Budget',
  category: 'Food & Drink',
  amount: 500,
  spent: 250,
  period: 'monthly',
  user_id: 'test-user-123',
  ...overrides,
})

// Mock transaction data
export const createMockTransaction = (overrides = {}) => ({
  account_id: 'account-123',
  amount: 25.50,
  date: '2024-01-15',
  name: 'Test Transaction',
  category: ['Food and Drink', 'Restaurants'],
  transaction_id: 'transaction-123',
  ...overrides,
})

// Mock account data
export const createMockAccount = (overrides = {}) => ({
  account_id: 'account-123',
  name: 'Test Account',
  type: 'depository',
  subtype: 'checking',
  balances: {
    available: 1500.00,
    current: 1500.00,
  },
  ...overrides,
})

// Helper to simulate user interaction delays
export const simulateDelay = (ms = 100) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Helper to trigger window resize for responsive tests
export const triggerResize = (width = 1024, height = 768) => {
  global.innerWidth = width
  global.innerHeight = height
  global.dispatchEvent(new Event('resize'))
}

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override the default render with our custom render
export { render, renderWithAuth, renderWithoutAuth }