import { http, HttpResponse } from 'msw'

// Mock data
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

const mockAccounts = [
  {
    account_id: 'account-123',
    name: 'Checking Account',
    type: 'depository',
    subtype: 'checking',
    balances: {
      available: 1500.00,
      current: 1500.00,
    },
  },
  {
    account_id: 'account-456',
    name: 'Savings Account',
    type: 'depository',
    subtype: 'savings',
    balances: {
      available: 5000.00,
      current: 5000.00,
    },
  },
]

export const handlers = [
  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy' })
  }),

  // Budget endpoints
  http.get('/api/v1/budgets', ({ request }) => {
    const url = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json(mockBudgets)
  }),

  http.post('/api/v1/budgets', async ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const budgetData = await request.json()
    const newBudget = {
      id: `budget-${Date.now()}`,
      ...budgetData,
      user_id: 'test-user-123',
    }

    mockBudgets.push(newBudget)
    return HttpResponse.json(newBudget, { status: 201 })
  }),

  http.put('/api/v1/budgets/:id', async ({ request, params }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const budgetId = params.id
    const budgetData = await request.json()
    const budgetIndex = mockBudgets.findIndex(b => b.id === budgetId)

    if (budgetIndex === -1) {
      return new HttpResponse(null, { status: 404 })
    }

    mockBudgets[budgetIndex] = { ...mockBudgets[budgetIndex], ...budgetData }
    return HttpResponse.json(mockBudgets[budgetIndex])
  }),

  http.delete('/api/v1/budgets/:id', ({ request, params }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const budgetId = params.id
    const budgetIndex = mockBudgets.findIndex(b => b.id === budgetId)

    if (budgetIndex === -1) {
      return new HttpResponse(null, { status: 404 })
    }

    mockBudgets.splice(budgetIndex, 1)
    return HttpResponse.json({ message: 'Budget deleted successfully' })
  }),

  http.get('/api/v1/budgets/spending-summary', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      totalBudget: 700,
      totalSpent: 400,
      categories: {
        'Food & Drink': { budgeted: 500, spent: 250 },
        'Transportation': { budgeted: 200, spent: 150 },
      },
    })
  }),

  http.get('/api/v1/budgets/suggestions', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
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
    })
  }),

  // Plaid endpoints
  http.get('/api/v1/plaid/link-token', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      link_token: 'link-sandbox-token-123',
      expiration: '2024-12-31T23:59:59Z',
    })
  }),

  http.post('/api/v1/plaid/exchange-token', async ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const { public_token } = await request.json()
    
    if (!public_token) {
      return new HttpResponse(null, { status: 400 })
    }

    return HttpResponse.json({
      access_token: 'access-sandbox-token-123',
      item_id: 'item-123',
    })
  }),

  http.get('/api/v1/plaid/accounts', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      accounts: mockAccounts,
      total_accounts: mockAccounts.length,
    })
  }),

  http.get('/api/v1/plaid/transactions', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const url = new URL(request.url)
    const count = parseInt(url.searchParams.get('count')) || 100
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    return HttpResponse.json({
      transactions: mockTransactions.slice(0, count),
      total_transactions: mockTransactions.length,
      accounts: mockAccounts,
    })
  }),

  // Notification endpoints
  http.get('/api/v1/notifications', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json([
      {
        id: 'notification-123',
        title: 'Budget Alert',
        message: 'You have spent 80% of your Groceries budget',
        type: 'warning',
        created_at: '2024-01-15T10:00:00Z',
        read: false,
      },
    ])
  }),

  http.put('/api/v1/notifications/:id/read', ({ request, params }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      id: params.id,
      read: true,
    })
  }),

  // Insights endpoints
  http.get('/api/v1/insights', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      insights: [
        {
          id: 'insight-123',
          title: 'Spending Pattern',
          description: 'You spend 30% more on weekends',
          type: 'spending',
          confidence: 0.85,
        },
      ],
    })
  }),

  // Monthly insights endpoint
  http.get('/api/v1/monthly-insights', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      totalSpent: 1250.00,
      topCategories: [
        { category: 'Food & Drink', amount: 450.00 },
        { category: 'Transportation', amount: 300.00 },
        { category: 'Shopping', amount: 250.00 },
      ],
      trends: {
        comparedToPreviousMonth: 10.5,
        averageDaily: 41.67,
      },
    })
  }),

  // Fallback handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return new HttpResponse(null, { status: 404 })
  }),
]