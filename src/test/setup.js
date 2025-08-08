import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { server } from './mocks/server'

// Mock Firebase module before importing any Firebase-related modules
vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  },
  db: {},
}))

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getIdToken: vi.fn(),
}))

// Mock React Router DOM
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    Navigate: ({ to }) => `Redirected to ${to}`,
  }
})

// Mock Recharts components to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => children,
  LineChart: ({ children }) => `<div>LineChart</div>`,
  Line: () => `<div>Line</div>`,
  XAxis: () => `<div>XAxis</div>`,
  YAxis: () => `<div>YAxis</div>`,
  CartesianGrid: () => `<div>CartesianGrid</div>`,
  Tooltip: () => `<div>Tooltip</div>`,
  PieChart: ({ children }) => `<div>PieChart</div>`,
  Pie: () => `<div>Pie</div>`,
  Cell: () => `<div>Cell</div>`,
  Legend: () => `<div>Legend</div>`,
  BarChart: ({ children }) => `<div>BarChart</div>`,
  Bar: () => `<div>Bar</div>`,
}))

// Mock react-plaid-link
vi.mock('react-plaid-link', () => ({
  usePlaidLink: () => ({
    open: vi.fn(),
    ready: true,
  }),
  PlaidLink: ({ children, onSuccess, onExit }) => (
    `<div onclick="${onSuccess}">Plaid Link Mock</div>`
  ),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => {
  const MockIcon = ({ size, className, ...props }) => (
    `<div className="${className}" style="width: ${size}px; height: ${size}px">Icon</div>`
  )
  
  return new Proxy({}, {
    get: () => MockIcon
  })
})

// Global test setup
beforeAll(() => {
  // Start MSW server
  server.listen({
    onUnhandledRequest: 'error'
  })
})

afterEach(() => {
  // Reset MSW handlers after each test
  server.resetHandlers()
  
  // Clear all mocks
  vi.clearAllMocks()
  
  // Clear localStorage
  localStorage.clear()
  
  // Reset document body
  document.body.innerHTML = ''
})

afterAll(() => {
  // Clean up after all tests
  server.close()
})

// Global test utilities
global.mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  getIdToken: vi.fn(() => Promise.resolve('mock-token-123')),
}

global.mockBudget = {
  id: 'budget-123',
  name: 'Groceries',
  category: 'Food & Drink',
  amount: 500,
  spent: 250,
  period: 'monthly',
  user_id: 'test-user-123',
}

global.mockTransaction = {
  account_id: 'account-123',
  amount: 25.50,
  date: '2024-01-15',
  name: 'Coffee Shop',
  category: ['Food and Drink', 'Restaurants'],
  transaction_id: 'transaction-123',
}

global.mockAccount = {
  account_id: 'account-123',
  name: 'Checking Account',
  type: 'depository',
  subtype: 'checking',
  balances: {
    available: 1500.00,
    current: 1500.00,
  },
}

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}