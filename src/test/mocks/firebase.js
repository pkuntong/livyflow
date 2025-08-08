import { vi } from 'vitest'

// Mock Firebase Auth
export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn((callback) => {
    // Simulate immediate call with current user
    setTimeout(() => callback(mockAuth.currentUser), 0)
    // Return unsubscribe function
    return vi.fn()
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve('mock-token-123')),
}

// Mock Firebase Firestore
export const mockDb = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    add: vi.fn(),
    where: vi.fn(() => ({
      get: vi.fn(),
      onSnapshot: vi.fn(),
    })),
    orderBy: vi.fn(() => ({
      limit: vi.fn(() => ({
        get: vi.fn(),
        onSnapshot: vi.fn(),
      })),
    })),
  })),
}

// Mock Firebase app initialization
export const mockApp = {
  name: 'mock-app',
  options: {},
}

// Helper functions for test setup
export const setMockUser = (user) => {
  mockAuth.currentUser = user
}

export const clearMockUser = () => {
  mockAuth.currentUser = null
}

export const simulateAuthStateChange = (user) => {
  mockAuth.currentUser = user
  // Trigger any registered onAuthStateChanged callbacks
  if (mockAuth.onAuthStateChanged.mock.calls.length > 0) {
    const callback = mockAuth.onAuthStateChanged.mock.calls[0][0]
    callback(user)
  }
}

// Mock Firebase auth functions
export const createUserWithEmailAndPassword = vi.fn()
export const signInWithEmailAndPassword = vi.fn()
export const signOut = vi.fn()
export const onAuthStateChanged = vi.fn()

// Default export
export default {
  auth: mockAuth,
  db: mockDb,
  app: mockApp,
  setMockUser,
  clearMockUser,
  simulateAuthStateChange,
}