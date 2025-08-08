import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import plaidService from '../plaidService'
import { mockAuth } from '../../test/mocks/firebase'

// Mock axios
vi.mock('axios')

// Mock Firebase auth
vi.mock('../../firebase', () => ({
  auth: mockAuth,
}))

describe('PlaidService', () => {
  const mockToken = 'mock-firebase-token'
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    getIdToken: vi.fn(() => Promise.resolve(mockToken)),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.currentUser = mockUser
  })

  describe('getAuthToken', () => {
    it('should return token when user is authenticated', async () => {
      const token = await plaidService.getAuthToken()
      expect(token).toBe(mockToken)
      expect(mockUser.getIdToken).toHaveBeenCalled()
    })

    it('should return null when no user is authenticated', async () => {
      mockAuth.currentUser = null
      const token = await plaidService.getAuthToken()
      expect(token).toBeNull()
    })

    it('should handle token retrieval errors gracefully', async () => {
      mockUser.getIdToken.mockRejectedValueOnce(new Error('Token error'))
      const token = await plaidService.getAuthToken()
      expect(token).toBeNull()
    })
  })

  describe('checkBackendHealth', () => {
    it('should return true when backend is healthy', async () => {
      axios.get.mockResolvedValueOnce({ status: 200 })

      const isHealthy = await plaidService.checkBackendHealth()

      expect(axios.get).toHaveBeenCalledWith('/api/health', {
        timeout: 5000,
      })
      expect(isHealthy).toBe(true)
    })

    it('should return false when backend is unhealthy', async () => {
      axios.get.mockRejectedValueOnce(new Error('Connection refused'))

      const isHealthy = await plaidService.checkBackendHealth()

      expect(isHealthy).toBe(false)
    })

    it('should return false on timeout', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      axios.get.mockRejectedValueOnce(timeoutError)

      const isHealthy = await plaidService.checkBackendHealth()

      expect(isHealthy).toBe(false)
    })

    it('should return false on non-200 status', async () => {
      axios.get.mockResolvedValueOnce({ status: 500 })

      const isHealthy = await plaidService.checkBackendHealth()

      expect(isHealthy).toBe(false)
    })
  })

  describe('getLinkToken', () => {
    const mockLinkToken = 'link-sandbox-token-123'
    const mockResponse = {
      data: {
        link_token: mockLinkToken,
        expiration: '2024-12-31T23:59:59Z',
      },
    }

    beforeEach(() => {
      // Mock health check to return true
      axios.get.mockImplementation((url) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({ status: 200 })
        }
        return Promise.resolve(mockResponse)
      })
    })

    it('should fetch link token successfully', async () => {
      const result = await plaidService.getLinkToken()

      expect(axios.get).toHaveBeenCalledWith('/api/v1/plaid/link-token', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`,
        },
        timeout: 10000,
      })
      expect(result).toBe(mockLinkToken)
    })

    it('should fetch link token without auth for test endpoint', async () => {
      const result = await plaidService.getLinkToken(true)

      expect(axios.get).toHaveBeenCalledWith('/api/v1/plaid/link-token', {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
      expect(result).toBe(mockLinkToken)
    })

    it('should throw error when backend is unavailable', async () => {
      // Mock health check to fail
      axios.get.mockImplementation((url) => {
        if (url.includes('/api/health')) {
          return Promise.reject(new Error('Connection refused'))
        }
        return Promise.resolve(mockResponse)
      })

      await expect(plaidService.getLinkToken())
        .rejects.toThrow('Backend server is not available')
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(plaidService.getLinkToken())
        .rejects.toThrow('No authentication token found - user must be signed in')
    })

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused')
      connectionError.code = 'ECONNREFUSED'
      axios.get.mockImplementation((url) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({ status: 200 })
        }
        return Promise.reject(connectionError)
      })

      await expect(plaidService.getLinkToken())
        .rejects.toThrow('Backend server is not running')
    })

    it('should handle 500 server errors', async () => {
      const serverError = {
        response: { status: 500, data: { error: 'Internal Server Error' } },
      }
      axios.get.mockImplementation((url) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({ status: 200 })
        }
        return Promise.reject(serverError)
      })

      await expect(plaidService.getLinkToken())
        .rejects.toThrow('Backend configuration error')
    })

    it('should handle 401 authentication errors', async () => {
      const authError = {
        response: { status: 401, data: { error: 'Unauthorized' } },
      }
      axios.get.mockImplementation((url) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({ status: 200 })
        }
        return Promise.reject(authError)
      })

      await expect(plaidService.getLinkToken())
        .rejects.toThrow('Authentication failed')
    })
  })

  describe('exchangePublicToken', () => {
    const publicToken = 'public-sandbox-token-123'
    const mockResponse = {
      data: {
        access_token: 'access-sandbox-token-123',
        item_id: 'item-123',
      },
    }

    it('should exchange public token successfully', async () => {
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await plaidService.exchangePublicToken(publicToken)

      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/plaid/exchange-token',
        { public_token: publicToken },
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(plaidService.exchangePublicToken(publicToken))
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused')
      connectionError.code = 'ECONNREFUSED'
      axios.post.mockRejectedValueOnce(connectionError)

      await expect(plaidService.exchangePublicToken(publicToken))
        .rejects.toThrow('Backend server is not running')
    })

    it('should handle 500 server errors', async () => {
      const serverError = {
        response: { status: 500, data: { error: 'Internal Server Error' } },
      }
      axios.post.mockRejectedValueOnce(serverError)

      await expect(plaidService.exchangePublicToken(publicToken))
        .rejects.toThrow('Backend configuration error')
    })
  })

  describe('getAccounts', () => {
    const mockAccounts = [
      {
        account_id: 'account-123',
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        balances: { available: 1500.00, current: 1500.00 },
      },
      {
        account_id: 'account-456',
        name: 'Savings Account',
        type: 'depository',
        subtype: 'savings',
        balances: { available: 5000.00, current: 5000.00 },
      },
    ]

    const mockResponse = {
      data: {
        accounts: mockAccounts,
        total_accounts: mockAccounts.length,
      },
    }

    it('should fetch accounts successfully', async () => {
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await plaidService.getAccounts()

      expect(axios.get).toHaveBeenCalledWith('/api/v1/plaid/accounts', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(plaidService.getAccounts())
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.get).not.toHaveBeenCalled()
    })

    it('should handle 400 no bank account error', async () => {
      const noAccountError = {
        response: { status: 400, data: { error: 'No access token found' } },
      }
      axios.get.mockRejectedValueOnce(noAccountError)

      await expect(plaidService.getAccounts())
        .rejects.toThrow('No bank account connected')
    })

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused')
      connectionError.code = 'ECONNREFUSED'
      axios.get.mockRejectedValueOnce(connectionError)

      await expect(plaidService.getAccounts())
        .rejects.toThrow('Backend server is not running')
    })

    it('should handle empty account list', async () => {
      const emptyResponse = { data: { accounts: [], total_accounts: 0 } }
      axios.get.mockResolvedValueOnce(emptyResponse)

      const result = await plaidService.getAccounts()

      expect(result).toEqual(emptyResponse.data)
      expect(result.accounts).toHaveLength(0)
    })
  })

  describe('getTransactions', () => {
    const mockTransactions = [
      {
        account_id: 'account-123',
        amount: 25.50,
        date: '2024-01-15',
        name: 'Coffee Shop',
        category: ['Food and Drink', 'Restaurants'],
        transaction_id: 'transaction-123',
      },
      {
        account_id: 'account-123',
        amount: 45.00,
        date: '2024-01-14',
        name: 'Gas Station',
        category: ['Transportation', 'Gas Stations'],
        transaction_id: 'transaction-456',
      },
    ]

    const mockResponse = {
      data: {
        transactions: mockTransactions,
        total_transactions: mockTransactions.length,
        accounts: [
          {
            account_id: 'account-123',
            name: 'Checking Account',
            type: 'depository',
            subtype: 'checking',
          },
        ],
      },
    }

    it('should fetch transactions successfully with default parameters', async () => {
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await plaidService.getTransactions()

      expect(axios.get).toHaveBeenCalledWith('/api/v1/plaid/transactions?count=100', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should fetch transactions with custom parameters', async () => {
      axios.get.mockResolvedValueOnce(mockResponse)
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      const count = 50

      const result = await plaidService.getTransactions(startDate, endDate, count)

      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/plaid/transactions?count=50&start_date=2024-01-01&end_date=2024-01-31`,
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(plaidService.getTransactions())
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.get).not.toHaveBeenCalled()
    })

    it('should handle 400 no bank account error', async () => {
      const noAccountError = {
        response: { status: 400, data: { error: 'No access token found' } },
      }
      axios.get.mockRejectedValueOnce(noAccountError)

      await expect(plaidService.getTransactions())
        .rejects.toThrow('No bank account connected')
    })

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused')
      connectionError.code = 'ECONNREFUSED'
      axios.get.mockRejectedValueOnce(connectionError)

      await expect(plaidService.getTransactions())
        .rejects.toThrow('Backend server is not running')
    })

    it('should handle empty transaction list', async () => {
      const emptyResponse = {
        data: {
          transactions: [],
          total_transactions: 0,
          accounts: [],
        },
      }
      axios.get.mockResolvedValueOnce(emptyResponse)

      const result = await plaidService.getTransactions()

      expect(result).toEqual(emptyResponse.data)
      expect(result.transactions).toHaveLength(0)
    })

    it('should handle large transaction counts', async () => {
      axios.get.mockResolvedValueOnce(mockResponse)

      await plaidService.getTransactions(null, null, 1000)

      expect(axios.get).toHaveBeenCalledWith(
        '/api/v1/plaid/transactions?count=1000',
        expect.objectContaining({
          timeout: 15000, // Should use longer timeout for large requests
        })
      )
    })

    it('should handle invalid date parameters gracefully', async () => {
      axios.get.mockResolvedValueOnce(mockResponse)

      // Should not crash with invalid dates
      await plaidService.getTransactions('invalid-date', 'another-invalid-date')

      expect(axios.get).toHaveBeenCalledWith(
        '/api/v1/plaid/transactions?count=100&start_date=invalid-date&end_date=another-invalid-date',
        expect.any(Object)
      )
    })
  })

  describe('Environment configuration', () => {
    it('should use correct baseURL configuration', () => {
      expect(plaidService.baseURL).toBeDefined()
    })

    it('should handle development vs production URL configuration', () => {
      const isDev = import.meta.env.DEV
      if (isDev) {
        expect(plaidService.baseURL).toBe('')
      } else {
        expect(plaidService.baseURL).toBe('https://livyflow.onrender.com')
      }
    })
  })

  describe('Error handling', () => {
    it('should log errors appropriately in development', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockError = new Error('Test error')
      axios.get.mockRejectedValueOnce(mockError)

      try {
        await plaidService.checkBackendHealth()
      } catch (error) {
        // Expected to handle error gracefully
      }

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle timeout errors specifically', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      axios.get.mockImplementation((url) => {
        if (url.includes('/api/health')) {
          return Promise.resolve({ status: 200 })
        }
        return Promise.reject(timeoutError)
      })

      await expect(plaidService.getLinkToken()).rejects.toThrow()
    })
  })
})