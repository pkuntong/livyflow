import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'

// Mock axios
vi.mock('axios')

// Mock Firebase auth
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve('mock-token-123')),
}

vi.mock('../firebase', () => ({
  auth: mockAuth,
}))

// Import after mocking
const budgetService = await import('../budgetService')

describe('BudgetService', () => {
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
      const token = await budgetService.default.getAuthToken()
      expect(token).toBe(mockToken)
      expect(mockUser.getIdToken).toHaveBeenCalled()
    })

    it('should return null when no user is authenticated', async () => {
      mockAuth.currentUser = null
      const token = await budgetService.getAuthToken()
      expect(token).toBeNull()
    })

    it('should handle token retrieval errors', async () => {
      mockUser.getIdToken.mockRejectedValueOnce(new Error('Token error'))
      const token = await budgetService.getAuthToken()
      expect(token).toBeNull()
    })
  })

  describe('createBudget', () => {
    const mockBudgetData = {
      name: 'Groceries',
      category: 'Food & Drink',
      amount: 500,
      period: 'monthly',
    }

    const mockResponse = {
      data: {
        id: 'budget-123',
        ...mockBudgetData,
        user_id: 'test-user-123',
      },
    }

    it('should create budget successfully', async () => {
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await budgetService.createBudget(mockBudgetData)

      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/budgets',
        mockBudgetData,
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(budgetService.createBudget(mockBudgetData))
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          data: { error: 'Budget creation failed' },
          status: 400,
        },
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(budgetService.createBudget(mockBudgetData))
        .rejects.toThrow()
    })

    it('should handle network errors', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network Error'))

      await expect(budgetService.createBudget(mockBudgetData))
        .rejects.toThrow('Network Error')
    })
  })

  describe('getBudgets', () => {
    const mockBudgets = [
      {
        id: 'budget-123',
        name: 'Groceries',
        category: 'Food & Drink',
        amount: 500,
        spent: 250,
        period: 'monthly',
        user_id: 'test-user-123',
      },
      {
        id: 'budget-456',
        name: 'Transportation',
        category: 'Transportation',
        amount: 200,
        spent: 150,
        period: 'monthly',
        user_id: 'test-user-123',
      },
    ]

    it('should fetch budgets successfully', async () => {
      axios.get.mockResolvedValueOnce({ data: mockBudgets })

      const result = await budgetService.getBudgets()

      expect(axios.get).toHaveBeenCalledWith('/api/v1/budgets', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockBudgets)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(budgetService.getBudgets())
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.get).not.toHaveBeenCalled()
    })

    it('should handle empty budget list', async () => {
      axios.get.mockResolvedValueOnce({ data: [] })

      const result = await budgetService.getBudgets()

      expect(result).toEqual([])
    })

    it('should handle 401 unauthorized error', async () => {
      const mockError = {
        response: { status: 401, data: { error: 'Unauthorized' } },
      }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(budgetService.getBudgets()).rejects.toThrow()
    })
  })

  describe('updateBudget', () => {
    const budgetId = 'budget-123'
    const updateData = {
      amount: 600,
      spent: 300,
    }

    const mockResponse = {
      data: {
        id: budgetId,
        name: 'Groceries',
        category: 'Food & Drink',
        amount: 600,
        spent: 300,
        period: 'monthly',
        user_id: 'test-user-123',
      },
    }

    it('should update budget successfully', async () => {
      axios.put.mockResolvedValueOnce(mockResponse)

      const result = await budgetService.updateBudget(budgetId, updateData)

      expect(axios.put).toHaveBeenCalledWith(
        `/api/v1/budgets/${budgetId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(budgetService.updateBudget(budgetId, updateData))
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.put).not.toHaveBeenCalled()
    })

    it('should handle 404 not found error', async () => {
      const mockError = {
        response: { status: 404, data: { error: 'Budget not found' } },
      }
      axios.put.mockRejectedValueOnce(mockError)

      await expect(budgetService.updateBudget(budgetId, updateData))
        .rejects.toThrow()
    })
  })

  describe('deleteBudget', () => {
    const budgetId = 'budget-123'

    it('should delete budget successfully', async () => {
      const mockResponse = { data: { message: 'Budget deleted successfully' } }
      axios.delete.mockResolvedValueOnce(mockResponse)

      const result = await budgetService.deleteBudget(budgetId)

      expect(axios.delete).toHaveBeenCalledWith(`/api/v1/budgets/${budgetId}`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(budgetService.deleteBudget(budgetId))
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.delete).not.toHaveBeenCalled()
    })

    it('should handle 404 not found error', async () => {
      const mockError = {
        response: { status: 404, data: { error: 'Budget not found' } },
      }
      axios.delete.mockRejectedValueOnce(mockError)

      await expect(budgetService.deleteBudget(budgetId))
        .rejects.toThrow()
    })
  })

  describe('getSpendingSummary', () => {
    const mockSummary = {
      totalBudget: 700,
      totalSpent: 400,
      categories: {
        'Food & Drink': { budgeted: 500, spent: 250 },
        'Transportation': { budgeted: 200, spent: 150 },
      },
    }

    it('should fetch spending summary successfully', async () => {
      axios.get.mockResolvedValueOnce({ data: mockSummary })

      const result = await budgetService.getSpendingSummary()

      expect(axios.get).toHaveBeenCalledWith('/api/v1/budgets/spending-summary', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockSummary)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(budgetService.getSpendingSummary())
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.get).not.toHaveBeenCalled()
    })

    it('should handle empty summary data', async () => {
      const emptySummary = {
        totalBudget: 0,
        totalSpent: 0,
        categories: {},
      }
      axios.get.mockResolvedValueOnce({ data: emptySummary })

      const result = await budgetService.getSpendingSummary()

      expect(result).toEqual(emptySummary)
    })
  })

  describe('getBudgetSuggestions', () => {
    const mockSuggestions = {
      suggestions: [
        {
          category: 'Entertainment',
          suggestedAmount: 100,
          reason: 'Based on your spending patterns',
        },
        {
          category: 'Shopping',
          suggestedAmount: 300,
          reason: 'Historical spending analysis',
        },
      ],
    }

    it('should fetch budget suggestions successfully', async () => {
      axios.get.mockResolvedValueOnce({ data: mockSuggestions })

      const result = await budgetService.getBudgetSuggestions()

      expect(axios.get).toHaveBeenCalledWith('/api/v1/budgets/suggestions', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockSuggestions)
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(budgetService.getBudgetSuggestions())
        .rejects.toThrow('No authentication token found - user must be signed in')

      expect(axios.get).not.toHaveBeenCalled()
    })

    it('should handle empty suggestions', async () => {
      const emptySuggestions = { suggestions: [] }
      axios.get.mockResolvedValueOnce({ data: emptySuggestions })

      const result = await budgetService.getBudgetSuggestions()

      expect(result).toEqual(emptySuggestions)
    })

    it('should handle API timeout', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      axios.get.mockRejectedValueOnce(timeoutError)

      await expect(budgetService.getBudgetSuggestions()).rejects.toThrow()
    })
  })

  describe('Environment configuration', () => {
    it('should use correct baseURL in development', () => {
      // The service is initialized during import, so we check the behavior
      expect(budgetService.baseURL).toBeDefined()
    })

    it('should handle development vs production URL configuration', () => {
      // This tests the constructor logic for URL configuration
      const isDev = import.meta.env.DEV
      if (isDev) {
        expect(budgetService.baseURL).toBe('')
      } else {
        expect(budgetService.baseURL).toBe('https://livyflow.onrender.com')
      }
    })
  })
})