import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithAuth } from '../../test/test-utils'
import Dashboard from '../Dashboard'
import plaidService from '../../services/plaidService'
import { createNotification } from '../../services/notificationService'

// Mock all the child components that would be complex to test
vi.mock('../../components/Alerts.jsx', () => ({
  default: () => <div data-testid="alerts-component">Alerts Component</div>
}))

vi.mock('../../components/Insights.jsx', () => ({
  default: () => <div data-testid="insights-component">Insights Component</div>
}))

vi.mock('../../components/dashboard/MonthlyInsightsPanel.jsx', () => ({
  default: () => <div data-testid="monthly-insights-panel">Monthly Insights Panel</div>
}))

vi.mock('../../components/RecurringSubscriptions.jsx', () => ({
  default: () => <div data-testid="recurring-subscriptions">Recurring Subscriptions</div>
}))

vi.mock('../../components/Export.jsx', () => ({
  default: () => <div data-testid="export-component">Export Component</div>
}))

vi.mock('../../components/dashboard/SpendingTrendsChart.jsx', () => ({
  default: () => <div data-testid="spending-trends-chart">Spending Trends Chart</div>
}))

vi.mock('../../../Components/dashboard/FinancialOverview.js', () => ({
  default: ({ accounts, transactions }) => (
    <div data-testid="financial-overview">
      Financial Overview: {accounts?.length || 0} accounts, {transactions?.length || 0} transactions
    </div>
  )
}))

vi.mock('../../../Components/dashboard/MonthlySpendingChart.js', () => ({
  default: () => <div data-testid="monthly-spending-chart">Monthly Spending Chart</div>
}))

vi.mock('../../../Components/dashboard/SpendingTrendChart.js', () => ({
  default: () => <div data-testid="spending-trend-chart">Spending Trend Chart</div>
}))

// Mock services
vi.mock('../../services/plaidService')
vi.mock('../../services/notificationService')

describe('Dashboard', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  }

  const mockTransactions = [
    {
      transaction_id: 'trans-1',
      name: 'Coffee Shop',
      amount: 4.50,
      date: '2024-01-15',
      category: ['Food and Drink', 'Restaurants'],
    },
    {
      transaction_id: 'trans-2',
      name: 'Gas Station',
      amount: 35.00,
      date: '2024-01-14',
      category: ['Transportation', 'Gas Stations'],
    },
  ]

  const mockAccounts = [
    {
      account_id: 'acc-1',
      name: 'Checking Account',
      type: 'depository',
      subtype: 'checking',
      balances: { available: 1500.00, current: 1500.00 },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    plaidService.getTransactions.mockResolvedValue({
      transactions: mockTransactions,
      accounts: mockAccounts,
    })
    createNotification.mockResolvedValue({ id: 'notification-123' })
  })

  describe('Rendering', () => {
    it('should render dashboard header and title', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
      expect(screen.getByText("Welcome back! Here's your financial overview.")).toBeInTheDocument()
    })

    it('should render all dashboard components', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      expect(screen.getByTestId('alerts-component')).toBeInTheDocument()
      expect(screen.getByTestId('financial-overview')).toBeInTheDocument()
      expect(screen.getByTestId('insights-component')).toBeInTheDocument()
      expect(screen.getByTestId('monthly-insights-panel')).toBeInTheDocument()
      expect(screen.getByTestId('recurring-subscriptions')).toBeInTheDocument()
      expect(screen.getByTestId('monthly-spending-chart')).toBeInTheDocument()
      expect(screen.getByTestId('spending-trend-chart')).toBeInTheDocument()
      expect(screen.getByTestId('spending-trends-chart')).toBeInTheDocument()
      expect(screen.getByTestId('export-component')).toBeInTheDocument()
    })

    it('should render Recent Transactions section', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
      expect(screen.getByText('+ Add')).toBeInTheDocument()
    })

    it('should render Quick Actions section', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('📊 View Analytics')).toBeInTheDocument()
      expect(screen.getByText('🎯 Set Budget Goals')).toBeInTheDocument()
      expect(screen.getByText('📈 Track Progress')).toBeInTheDocument()
    })
  })

  describe('Transaction Loading', () => {
    it('should show loading state when fetching transactions', async () => {
      plaidService.getTransactions.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ transactions: [] }), 100))
      )

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Loading transactions...')).toBeInTheDocument()
      })
    })

    it('should load Plaid transactions on mount when user is authenticated', async () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(plaidService.getTransactions).toHaveBeenCalledWith(null, null, 500)
      })
    })

    it('should not load transactions when user is not authenticated', () => {
      renderWithAuth(<Dashboard />, { user: null })

      expect(plaidService.getTransactions).not.toHaveBeenCalled()
    })

    it('should display transactions after successful load', async () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
        expect(screen.getByText('Gas Station')).toBeInTheDocument()
        expect(screen.getByText('+$4.50')).toBeInTheDocument()
        expect(screen.getByText('+$35.00')).toBeInTheDocument()
      })
    })
  })

  describe('Transaction Error Handling', () => {
    it('should handle 400 error (no bank account connected)', async () => {
      const error = {
        response: { status: 400, data: { error: 'No access token found' } },
      }
      plaidService.getTransactions.mockRejectedValueOnce(error)

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText(/No bank account connected/)).toBeInTheDocument()
        expect(screen.getByText(/💡/)).toBeInTheDocument()
      })
    })

    it('should handle 401 error (authentication failed)', async () => {
      const error = {
        response: { status: 401, data: { error: 'Unauthorized' } },
      }
      plaidService.getTransactions.mockRejectedValueOnce(error)

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Authentication failed. Please sign in again.')).toBeInTheDocument()
        expect(screen.getByText(/❌/)).toBeInTheDocument()
      })
    })

    it('should handle 403 error (access denied)', async () => {
      const error = {
        response: { status: 403, data: { error: 'Forbidden' } },
      }
      plaidService.getTransactions.mockRejectedValueOnce(error)

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Access denied. Please check your permissions.')).toBeInTheDocument()
        expect(screen.getByText(/❌/)).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      const error = new Error('Network error')
      plaidService.getTransactions.mockRejectedValueOnce(error)

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.getByText(/❌/)).toBeInTheDocument()
      })
    })

    it('should show "No transactions found" when no data is available', async () => {
      plaidService.getTransactions.mockResolvedValueOnce({
        transactions: [],
        accounts: [],
      })

      renderWithAuth(<Dashboard transactions={[]} />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('No transactions found')).toBeInTheDocument()
        expect(screen.getByText('Add some transactions or connect your bank account to see activity')).toBeInTheDocument()
      })
    })
  })

  describe('Manual Refresh', () => {
    it('should refresh transactions when refresh button is clicked', async () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      // Wait for initial load
      await waitFor(() => {
        expect(plaidService.getTransactions).toHaveBeenCalledTimes(1)
      })

      // Click refresh button
      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(plaidService.getTransactions).toHaveBeenCalledTimes(2)
      })
    })

    it('should show refreshing state when refresh is in progress', async () => {
      let resolvePromise
      plaidService.getTransactions
        .mockResolvedValueOnce({ transactions: mockTransactions })
        .mockImplementationOnce(() => new Promise(resolve => { resolvePromise = resolve }))

      renderWithAuth(<Dashboard />, { user: mockUser })

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })

      // Click refresh button
      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      // Should show refreshing state
      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument()
        expect(refreshButton).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise({ transactions: mockTransactions })

      // Should return to normal state
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
        expect(refreshButton).not.toBeDisabled()
      })
    })

    it('should not refresh when user is not authenticated', () => {
      renderWithAuth(<Dashboard />, { user: null })

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      expect(plaidService.getTransactions).not.toHaveBeenCalled()
    })

    it('should disable refresh button during loading', async () => {
      plaidService.getTransactions.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ transactions: [] }), 100))
      )

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh')
        expect(refreshButton).toBeDisabled()
      })
    })
  })

  describe('Welcome Notification', () => {
    it('should show welcome notification for new users', async () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(createNotification).toHaveBeenCalledWith({
          title: "Welcome to LivyFlow! 🎉",
          message: "Your financial journey starts here. We'll help you track spending, set budgets, and achieve your financial goals.",
          type: "success"
        })
      })
    })

    it('should only show welcome notification once', async () => {
      const { rerender } = renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(createNotification).toHaveBeenCalledTimes(1)
      })

      // Re-render component
      rerender(<Dashboard />)

      // Should not call createNotification again
      expect(createNotification).toHaveBeenCalledTimes(1)
    })

    it('should not show welcome notification when user is not authenticated', () => {
      renderWithAuth(<Dashboard />, { user: null })

      expect(createNotification).not.toHaveBeenCalled()
    })

    it('should handle welcome notification errors gracefully', async () => {
      createNotification.mockRejectedValueOnce(new Error('Notification error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(createNotification).toHaveBeenCalled()
      })

      // Component should still render normally
      expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
      consoleSpy.mockRestore()
    })
  })

  describe('Transaction Data Combination', () => {
    it('should combine manual transactions with Plaid transactions', async () => {
      const manualTransactions = [
        {
          id: 'manual-1',
          name: 'Manual Transaction',
          amount: 10.00,
          date: '2024-01-16',
          category: 'Other',
        },
      ]

      renderWithAuth(
        <Dashboard transactions={manualTransactions} />, 
        { user: mockUser }
      )

      await waitFor(() => {
        expect(screen.getByText('Manual Transaction')).toBeInTheDocument()
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
        expect(screen.getByText('Gas Station')).toBeInTheDocument()
      })
    })

    it('should handle empty/invalid transactions prop', async () => {
      renderWithAuth(<Dashboard transactions={null} />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
        expect(screen.getByText('Gas Station')).toBeInTheDocument()
      })
    })

    it('should pass combined transactions to FinancialOverview', async () => {
      const manualTransactions = [{ id: 'manual-1', name: 'Manual', amount: 10 }]

      renderWithAuth(
        <Dashboard transactions={manualTransactions} accounts={mockAccounts} />, 
        { user: mockUser }
      )

      await waitFor(() => {
        const financialOverview = screen.getByTestId('financial-overview')
        expect(financialOverview).toHaveTextContent('1 accounts, 3 transactions')
      })
    })
  })

  describe('Transaction Display', () => {
    it('should format transaction amounts correctly', async () => {
      const transactions = [
        {
          transaction_id: 'pos-1',
          name: 'Income',
          amount: -100.00, // Negative amount should show as positive (income)
          date: '2024-01-15',
        },
        {
          transaction_id: 'pos-2',
          name: 'Expense',
          amount: 50.00, // Positive amount should show as negative (expense)
          date: '2024-01-14',
        },
      ]

      plaidService.getTransactions.mockResolvedValueOnce({
        transactions,
        accounts: [],
      })

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('+$100.00')).toBeInTheDocument() // Income shows positive
        expect(screen.getByText('+$50.00')).toBeInTheDocument()  // Expense shows positive (absolute value)
      })
    })

    it('should format transaction dates correctly', async () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Jan 15')).toBeInTheDocument()
        expect(screen.getByText('Jan 14')).toBeInTheDocument()
      })
    })

    it('should display transaction categories correctly', async () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Food and Drink')).toBeInTheDocument()
        expect(screen.getByText('Transportation')).toBeInTheDocument()
      })
    })

    it('should handle missing transaction data gracefully', async () => {
      const incompleteTransactions = [
        {
          transaction_id: 'incomplete-1',
          amount: 25.50,
          // Missing name, category, date
        },
      ]

      plaidService.getTransactions.mockResolvedValueOnce({
        transactions: incompleteTransactions,
        accounts: [],
      })

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Unknown Transaction')).toBeInTheDocument()
        expect(screen.getByText('Unknown Date')).toBeInTheDocument()
      })
    })

    it('should handle array category format', async () => {
      const transactionWithArrayCategory = [
        {
          transaction_id: 'array-cat-1',
          name: 'Test Transaction',
          amount: 10.00,
          date: '2024-01-15',
          category: ['Food_and_Drink', 'Restaurants'],
        },
      ]

      plaidService.getTransactions.mockResolvedValueOnce({
        transactions: transactionWithArrayCategory,
        accounts: [],
      })

      renderWithAuth(<Dashboard />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Food and Drink')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should handle mobile layout classes', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      const dashboard = screen.getByText('Financial Dashboard').closest('div')
      expect(dashboard).toHaveClass('w-full')

      const gridContainer = dashboard.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      const mainHeading = screen.getByRole('heading', { name: /Financial Dashboard/i, level: 1 })
      expect(mainHeading).toBeInTheDocument()

      const subHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(subHeadings.length).toBeGreaterThan(0)
    })

    it('should have accessible buttons', () => {
      renderWithAuth(<Dashboard />, { user: mockUser })

      const refreshButton = screen.getByRole('button', { name: /Refresh/ })
      expect(refreshButton).toBeInTheDocument()
      expect(refreshButton).toHaveAttribute('type', 'button')

      const addButton = screen.getByRole('button', { name: /\+ Add/ })
      expect(addButton).toBeInTheDocument()
    })
  })
})