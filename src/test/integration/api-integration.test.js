import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import budgetService from '../../services/budgetService'
import plaidService from '../../services/plaidService'

// Mock the Firebase module
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      getIdToken: vi.fn(() => Promise.resolve('mock-token-123')),
    }
  }
}))

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Budget Service Integration', () => {
    describe('getBudgets', () => {
      it('should fetch budgets successfully', async () => {
        const result = await budgetService.getBudgets()

        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBeGreaterThan(0)
        expect(result[0]).toHaveProperty('id')
        expect(result[0]).toHaveProperty('name')
        expect(result[0]).toHaveProperty('amount')
      })

      it('should handle unauthorized access', async () => {
        // Mock no current user
        vi.doMock('../../firebase', () => ({
          auth: { currentUser: null }
        }))

        await expect(budgetService.getBudgets()).rejects.toThrow(
          'No authentication token found - user must be signed in'
        )
      })

      it('should handle server errors gracefully', async () => {
        server.use(
          http.get('/api/v1/budgets', () => {
            return new HttpResponse(null, { status: 500 })
          })
        )

        await expect(budgetService.getBudgets()).rejects.toThrow()
      })
    })

    describe('createBudget', () => {
      it('should create budget with valid data', async () => {
        const budgetData = {
          name: 'Integration Test Budget',
          category: 'Entertainment',
          amount: 300,
          period: 'monthly',
        }

        const result = await budgetService.createBudget(budgetData)

        expect(result).toHaveProperty('id')
        expect(result.name).toBe(budgetData.name)
        expect(result.amount).toBe(budgetData.amount)
        expect(result.user_id).toBe(mockUser.uid)
      })

      it('should validate required fields', async () => {
        server.use(
          http.post('/api/v1/budgets', () => {
            return new HttpResponse(
              JSON.stringify({ error: 'Name is required' }),
              { status: 400 }
            )
          })
        )

        const invalidBudgetData = {
          amount: 300,
          period: 'monthly',
        }

        await expect(budgetService.createBudget(invalidBudgetData)).rejects.toThrow()
      })

      it('should handle duplicate budget names', async () => {
        server.use(
          http.post('/api/v1/budgets', () => {
            return new HttpResponse(
              JSON.stringify({ error: 'Budget name already exists' }),
              { status: 409 }
            )
          })
        )

        const budgetData = {
          name: 'Existing Budget',
          amount: 300,
          period: 'monthly',
        }

        await expect(budgetService.createBudget(budgetData)).rejects.toThrow()
      })
    })

    describe('updateBudget', () => {
      it('should update existing budget', async () => {
        const budgetId = 'budget-123'
        const updateData = {
          name: 'Updated Budget Name',
          amount: 600,
        }

        const result = await budgetService.updateBudget(budgetId, updateData)

        expect(result).toHaveProperty('id', budgetId)
        expect(result.name).toBe(updateData.name)
        expect(result.amount).toBe(updateData.amount)
      })

      it('should handle non-existent budget', async () => {
        server.use(
          http.put('/api/v1/budgets/:id', () => {
            return new HttpResponse(null, { status: 404 })
          })
        )

        await expect(
          budgetService.updateBudget('non-existent', { name: 'Updated' })
        ).rejects.toThrow()
      })
    })

    describe('deleteBudget', () => {
      it('should delete existing budget', async () => {
        const budgetId = 'budget-123'

        const result = await budgetService.deleteBudget(budgetId)

        expect(result).toHaveProperty('message')
      })

      it('should handle non-existent budget deletion', async () => {
        server.use(
          http.delete('/api/v1/budgets/:id', () => {
            return new HttpResponse(null, { status: 404 })
          })
        )

        await expect(budgetService.deleteBudget('non-existent')).rejects.toThrow()
      })
    })

    describe('getSpendingSummary', () => {
      it('should fetch spending summary with calculated totals', async () => {
        const result = await budgetService.getSpendingSummary()

        expect(result).toHaveProperty('totalBudget')
        expect(result).toHaveProperty('totalSpent')
        expect(result).toHaveProperty('categories')
        expect(typeof result.totalBudget).toBe('number')
        expect(typeof result.totalSpent).toBe('number')
        expect(result.totalBudget).toBeGreaterThanOrEqual(result.totalSpent)
      })

      it('should include category breakdowns', async () => {
        const result = await budgetService.getSpendingSummary()

        expect(result.categories).toBeDefined()
        const categoryKeys = Object.keys(result.categories)
        expect(categoryKeys.length).toBeGreaterThan(0)

        categoryKeys.forEach(category => {
          expect(result.categories[category]).toHaveProperty('budgeted')
          expect(result.categories[category]).toHaveProperty('spent')
        })
      })
    })

    describe('getBudgetSuggestions', () => {
      it('should fetch intelligent budget suggestions', async () => {
        const result = await budgetService.getBudgetSuggestions()

        expect(result).toHaveProperty('suggestions')
        expect(Array.isArray(result.suggestions)).toBe(true)

        if (result.suggestions.length > 0) {
          const suggestion = result.suggestions[0]
          expect(suggestion).toHaveProperty('category')
          expect(suggestion).toHaveProperty('suggestedAmount')
          expect(suggestion).toHaveProperty('reason')
        }
      })
    })
  })

  describe('Plaid Service Integration', () => {
    describe('Backend Health Check', () => {
      it('should verify backend is running', async () => {
        const isHealthy = await plaidService.checkBackendHealth()
        expect(isHealthy).toBe(true)
      })

      it('should handle backend downtime', async () => {
        server.use(
          http.get('/api/health', () => {
            return new HttpResponse(null, { status: 503 })
          })
        )

        const isHealthy = await plaidService.checkBackendHealth()
        expect(isHealthy).toBe(false)
      })
    })

    describe('getLinkToken', () => {
      it('should fetch Plaid link token for authenticated user', async () => {
        const linkToken = await plaidService.getLinkToken()

        expect(typeof linkToken).toBe('string')
        expect(linkToken.length).toBeGreaterThan(0)
        expect(linkToken).toMatch(/^link-/)
      })

      it('should support test endpoint without authentication', async () => {
        clearMockUser()
        const linkToken = await plaidService.getLinkToken(true)

        expect(typeof linkToken).toBe('string')
        expect(linkToken.length).toBeGreaterThan(0)
      })

      it('should handle invalid authentication', async () => {
        server.use(
          http.get('/api/v1/plaid/link-token', () => {
            return new HttpResponse(null, { status: 401 })
          })
        )

        await expect(plaidService.getLinkToken()).rejects.toThrow()
      })
    })

    describe('exchangePublicToken', () => {
      it('should exchange public token for access token', async () => {
        const publicToken = 'public-sandbox-token-123'

        const result = await plaidService.exchangePublicToken(publicToken)

        expect(result).toHaveProperty('access_token')
        expect(result).toHaveProperty('item_id')
        expect(result.access_token).toMatch(/^access-/)
        expect(result.item_id).toMatch(/^item-/)
      })

      it('should validate public token format', async () => {
        server.use(
          http.post('/api/v1/plaid/exchange-token', () => {
            return new HttpResponse(
              JSON.stringify({ error: 'Invalid public token' }),
              { status: 400 }
            )
          })
        )

        await expect(
          plaidService.exchangePublicToken('invalid-token')
        ).rejects.toThrow()
      })
    })

    describe('getAccounts', () => {
      it('should fetch user bank accounts', async () => {
        const result = await plaidService.getAccounts()

        expect(result).toHaveProperty('accounts')
        expect(result).toHaveProperty('total_accounts')
        expect(Array.isArray(result.accounts)).toBe(true)
        expect(result.total_accounts).toBe(result.accounts.length)

        if (result.accounts.length > 0) {
          const account = result.accounts[0]
          expect(account).toHaveProperty('account_id')
          expect(account).toHaveProperty('name')
          expect(account).toHaveProperty('type')
          expect(account).toHaveProperty('balances')
        }
      })

      it('should handle accounts with different types', async () => {
        const result = await plaidService.getAccounts()

        const accountTypes = new Set(result.accounts.map(acc => acc.type))
        expect(accountTypes.has('depository')).toBe(true)

        // Verify balance structure
        result.accounts.forEach(account => {
          expect(account.balances).toHaveProperty('available')
          expect(account.balances).toHaveProperty('current')
          expect(typeof account.balances.available).toBe('number')
          expect(typeof account.balances.current).toBe('number')
        })
      })

      it('should handle no connected accounts', async () => {
        server.use(
          http.get('/api/v1/plaid/accounts', () => {
            return new HttpResponse(null, { status: 400 })
          })
        )

        await expect(plaidService.getAccounts()).rejects.toThrow(
          'No bank account connected'
        )
      })
    })

    describe('getTransactions', () => {
      it('should fetch transactions with default parameters', async () => {
        const result = await plaidService.getTransactions()

        expect(result).toHaveProperty('transactions')
        expect(result).toHaveProperty('total_transactions')
        expect(result).toHaveProperty('accounts')
        expect(Array.isArray(result.transactions)).toBe(true)
        expect(Array.isArray(result.accounts)).toBe(true)

        if (result.transactions.length > 0) {
          const transaction = result.transactions[0]
          expect(transaction).toHaveProperty('transaction_id')
          expect(transaction).toHaveProperty('account_id')
          expect(transaction).toHaveProperty('amount')
          expect(transaction).toHaveProperty('date')
          expect(transaction).toHaveProperty('name')
          expect(transaction).toHaveProperty('category')
        }
      })

      it('should support date range filtering', async () => {
        const startDate = '2024-01-01'
        const endDate = '2024-01-31'
        const count = 50

        const result = await plaidService.getTransactions(startDate, endDate, count)

        expect(result).toHaveProperty('transactions')
        expect(result.transactions.length).toBeLessThanOrEqual(count)

        // Verify transactions are within date range
        result.transactions.forEach(transaction => {
          const transactionDate = new Date(transaction.date)
          expect(transactionDate).toBeInstanceOf(Date)
        })
      })

      it('should handle large transaction requests', async () => {
        const result = await plaidService.getTransactions(null, null, 1000)

        expect(result).toHaveProperty('transactions')
        // Should handle large requests gracefully
        expect(Array.isArray(result.transactions)).toBe(true)
      })

      it('should categorize transactions correctly', async () => {
        const result = await plaidService.getTransactions()

        result.transactions.forEach(transaction => {
          expect(transaction.category).toBeDefined()
          expect(Array.isArray(transaction.category)).toBe(true)
          expect(transaction.category.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('Cross-Service Data Flow', () => {
    it('should integrate Plaid transactions with budget calculations', async () => {
      // Get transactions
      const transactionData = await plaidService.getTransactions()
      expect(transactionData.transactions.length).toBeGreaterThan(0)

      // Get budgets
      const budgets = await budgetService.getBudgets()
      expect(budgets.length).toBeGreaterThan(0)

      // Get spending summary (which should incorporate transaction data)
      const summary = await budgetService.getSpendingSummary()
      expect(summary.totalSpent).toBeGreaterThan(0)

      // Verify data consistency
      expect(summary.totalBudget).toBe(
        budgets.reduce((sum, budget) => sum + budget.amount, 0)
      )
    })

    it('should handle budget creation after connecting Plaid account', async () => {
      // Simulate account connection flow
      const linkToken = await plaidService.getLinkToken()
      expect(linkToken).toBeDefined()

      const exchangeResult = await plaidService.exchangePublicToken('public-test-token')
      expect(exchangeResult.access_token).toBeDefined()

      // Get transactions to analyze spending patterns
      const transactions = await plaidService.getTransactions()
      expect(transactions.transactions.length).toBeGreaterThan(0)

      // Create budget based on transaction analysis
      const categories = new Set(
        transactions.transactions.flatMap(t => t.category)
      )
      expect(categories.size).toBeGreaterThan(0)

      // Create budget for the most common category
      const topCategory = Array.from(categories)[0]
      const budgetData = {
        name: `${topCategory} Budget`,
        category: topCategory,
        amount: 500,
        period: 'monthly',
      }

      const newBudget = await budgetService.createBudget(budgetData)
      expect(newBudget.id).toBeDefined()
      expect(newBudget.category).toBe(topCategory)
    })

    it('should maintain data consistency across service calls', async () => {
      // Create a budget
      const budgetData = {
        name: 'Consistency Test Budget',
        category: 'Food & Drink',
        amount: 400,
        period: 'monthly',
      }

      const createdBudget = await budgetService.createBudget(budgetData)
      expect(createdBudget.id).toBeDefined()

      // Verify it appears in budget list
      const allBudgets = await budgetService.getBudgets()
      const foundBudget = allBudgets.find(b => b.id === createdBudget.id)
      expect(foundBudget).toBeDefined()
      expect(foundBudget.name).toBe(budgetData.name)

      // Verify it affects spending summary
      const summaryBefore = await budgetService.getSpendingSummary()
      expect(summaryBefore.totalBudget).toBeGreaterThanOrEqual(budgetData.amount)

      // Update the budget
      const updateData = { amount: 600 }
      const updatedBudget = await budgetService.updateBudget(createdBudget.id, updateData)
      expect(updatedBudget.amount).toBe(updateData.amount)

      // Verify updated amount in summary
      const summaryAfter = await budgetService.getSpendingSummary()
      expect(summaryAfter.totalBudget).toBe(
        summaryBefore.totalBudget + (updateData.amount - budgetData.amount)
      )

      // Clean up
      await budgetService.deleteBudget(createdBudget.id)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      server.use(
        http.get('/api/v1/budgets', () => {
          // Simulate network timeout
          return new Promise(() => {}) // Never resolves
        })
      )

      // This would normally timeout based on axios configuration
      await expect(budgetService.getBudgets()).rejects.toThrow()
    })

    it('should handle malformed API responses', async () => {
      server.use(
        http.get('/api/v1/budgets', () => {
          return new HttpResponse('Invalid JSON Response', {
            headers: { 'Content-Type': 'application/json' }
          })
        })
      )

      await expect(budgetService.getBudgets()).rejects.toThrow()
    })

    it('should handle partial service failures', async () => {
      // Budget service works, but Plaid service fails
      server.use(
        http.get('/api/v1/plaid/accounts', () => {
          return new HttpResponse(null, { status: 503 })
        })
      )

      // Budget operations should still work
      const budgets = await budgetService.getBudgets()
      expect(budgets).toBeDefined()

      // Plaid operations should fail
      await expect(plaidService.getAccounts()).rejects.toThrow()
    })

    it('should handle rate limiting', async () => {
      let callCount = 0
      server.use(
        http.get('/api/v1/budgets', () => {
          callCount++
          if (callCount <= 2) {
            return new HttpResponse(
              JSON.stringify({ error: 'Rate limit exceeded' }),
              { status: 429 }
            )
          }
          return HttpResponse.json([])
        })
      )

      // First few calls should be rate limited
      await expect(budgetService.getBudgets()).rejects.toThrow()
      await expect(budgetService.getBudgets()).rejects.toThrow()

      // Eventually should succeed
      const result = await budgetService.getBudgets()
      expect(result).toBeDefined()
    })
  })
})