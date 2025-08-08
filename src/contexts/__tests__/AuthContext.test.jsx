import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { mockAuth, simulateAuthStateChange, setMockUser, clearMockUser } from '../../test/mocks/firebase'

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

vi.mock('../../firebase', () => ({
  auth: mockAuth,
}))

// Test component that uses the auth context
const TestComponent = () => {
  const { user, currentUser, signup, login, logout, setAuthToken, getAuthToken } = useAuth()
  
  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </div>
      <div data-testid="current-user">
        {currentUser ? currentUser.uid : 'No current user'}
      </div>
      <button onClick={() => signup('test@example.com', 'password')}>
        Sign Up
      </button>
      <button onClick={() => login('test@example.com', 'password')}>
        Log In
      </button>
      <button onClick={logout}>Log Out</button>
      <button onClick={() => setAuthToken('test-token')}>
        Set Token
      </button>
      <div data-testid="auth-token">{getAuthToken()}</div>
    </div>
  )
}

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMockUser()
    mockLocalStorage.clear()
  })

  describe('AuthProvider', () => {
    it('should provide auth context values', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in')
      expect(screen.getByTestId('current-user')).toHaveTextContent('No current user')
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      expect(screen.getByText('Log In')).toBeInTheDocument()
      expect(screen.getByText('Log Out')).toBeInTheDocument()
    })

    it('should update user state when auth state changes', async () => {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: vi.fn(() => Promise.resolve('mock-token-123')),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially no user
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in')

      // Simulate user login
      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com')
        expect(screen.getByTestId('current-user')).toHaveTextContent('test-user-123')
      })
    })

    it('should store auth token when user is authenticated', async () => {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdToken: vi.fn(() => Promise.resolve('firebase-id-token-123')),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'firebase-id-token-123')
      })
    })

    it('should clear auth token when user logs out', async () => {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdToken: vi.fn(() => Promise.resolve('firebase-id-token-123')),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Simulate user login
      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      // Simulate user logout
      await act(async () => {
        simulateAuthStateChange(null)
      })

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken')
        expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in')
      })
    })

    it('should handle token retrieval errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdToken: vi.fn(() => Promise.reject(new Error('Token error'))),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error getting auth token:', expect.any(Error))
        expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('useAuth hook', () => {
    it('should provide signup function', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      createUserWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'test-123' } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        screen.getByText('Sign Up').click()
      })

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'test@example.com',
        'password'
      )
    })

    it('should provide login function', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'test-123' } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        screen.getByText('Log In').click()
      })

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'test@example.com',
        'password'
      )
    })

    it('should provide logout function', async () => {
      const { signOut } = await import('firebase/auth')
      signOut.mockResolvedValueOnce()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        screen.getByText('Log Out').click()
      })

      expect(signOut).toHaveBeenCalledWith(mockAuth)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken')
    })

    it('should provide setAuthToken function', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        screen.getByText('Set Token').click()
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'test-token')
    })

    it('should provide getAuthToken function', () => {
      mockLocalStorage.setItem('authToken', 'stored-token')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('auth-token')).toHaveTextContent('stored-token')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken')
    })

    it('should return null when no token is stored', () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('auth-token')).toHaveTextContent('')
    })
  })

  describe('Loading state', () => {
    it('should not render children while loading', () => {
      // Mock onAuthStateChanged to not call callback immediately
      mockAuth.onAuthStateChanged.mockImplementation(() => vi.fn())

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.queryByTestId('user-status')).not.toBeInTheDocument()
    })

    it('should render children after loading is complete', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toBeInTheDocument()
      })
    })
  })

  describe('Context usage outside provider', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('Firebase auth integration', () => {
    it('should handle Firebase auth state changes', async () => {
      const mockUser = {
        uid: 'firebase-user-123',
        email: 'firebase@example.com',
        getIdToken: vi.fn(() => Promise.resolve('firebase-token-123')),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as firebase@example.com')
      })
    })

    it('should handle Firebase auth errors during token retrieval', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdToken: vi.fn(() => Promise.reject(new Error('Firebase error'))),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error getting auth token:',
          expect.any(Error)
        )
        expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com')
      })

      consoleSpy.mockRestore()
    })

    it('should cleanup auth listener on unmount', () => {
      const unsubscribeMock = vi.fn()
      mockAuth.onAuthStateChanged.mockReturnValueOnce(unsubscribeMock)

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('Token management', () => {
    it('should handle token updates correctly', async () => {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdToken: vi.fn()
          .mockResolvedValueOnce('token-1')
          .mockResolvedValueOnce('token-2'),
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // First auth state change
      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'token-1')
      })

      // Second auth state change (token refresh)
      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'token-2')
      })
    })

    it('should preserve user state even when token fails to refresh', async () => {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdToken: vi.fn()
          .mockResolvedValueOnce('initial-token')
          .mockRejectedValueOnce(new Error('Token refresh failed')),
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initial successful auth
      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com')
      })

      // Token refresh failure
      await act(async () => {
        simulateAuthStateChange(mockUser)
      })

      // User should still be logged in despite token failure
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com')
      expect(consoleSpy).toHaveBeenCalledWith('Error getting auth token:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })
})