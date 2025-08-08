import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth } from '../../test/test-utils'
import Budgets from '../Budgets'
import budgetService from '../../services/budgetService'

// Mock child components to focus on Budgets component logic
vi.mock('../../components/budgets/BudgetModal', () => ({
  default: ({ isOpen, onClose, onSave, budget }) => (
    isOpen ? (
      <div data-testid="budget-modal">
        <button onClick={() => onSave({ name: 'Test Budget', amount: 500 })}>
          Save Budget
        </button>
        <button onClick={onClose}>Close Modal</button>
        <div data-testid="modal-budget-data">
          {budget ? `Editing: ${budget.name}` : 'Creating new budget'}
        </div>
      </div>
    ) : null
  )
}))

vi.mock('../../components/budgets/BudgetCard', () => ({
  default: ({ budget, onEdit, onDelete }) => (
    <div data-testid="budget-card">
      <h3>{budget.name}</h3>
      <p>Amount: ${budget.amount}</p>
      <p>Spent: ${budget.spent || 0}</p>
      <button onClick={() => onEdit(budget)}>Edit</button>
      <button onClick={() => onDelete(budget.id)}>Delete</button>
    </div>
  )
}))

vi.mock('../../components/budgets/BudgetCharts', () => ({
  default: ({ budgets, spendingSummary }) => (
    <div data-testid="budget-charts">
      Budget Charts: {budgets?.length || 0} budgets
      {spendingSummary && <span data-testid="has-spending-summary">Has summary</span>}
    </div>
  )
}))

vi.mock('../../components/budgets/BudgetSuggestions', () => ({
  default: () => <div data-testid="budget-suggestions">Budget Suggestions</div>
}))

vi.mock('../../components/budgets/BudgetRecommendations', () => ({
  default: () => <div data-testid="budget-recommendations">Budget Recommendations</div>
}))

// Mock budget service
vi.mock('../../services/budgetService')

describe('Budgets', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  }

  const mockBudgets = [
    {
      id: 'budget-1',
      name: 'Groceries',
      category: 'Food & Drink',
      amount: 500,
      spent: 250,
      period: 'monthly',
    },
    {
      id: 'budget-2',
      name: 'Transportation',
      category: 'Transportation',
      amount: 200,
      spent: 150,
      period: 'monthly',
    },
  ]

  const mockSpendingSummary = {
    totalBudget: 700,
    totalSpent: 400,
    categories: {
      'Food & Drink': { budgeted: 500, spent: 250 },
      'Transportation': { budgeted: 200, spent: 150 },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    budgetService.getBudgets.mockResolvedValue({ budgets: mockBudgets })
    budgetService.getSpendingSummary.mockResolvedValue(mockSpendingSummary)
    budgetService.createBudget.mockResolvedValue({ id: 'new-budget', name: 'New Budget' })
    budgetService.updateBudget.mockResolvedValue({ id: 'budget-1', name: 'Updated Budget' })
    budgetService.deleteBudget.mockResolvedValue({ message: 'Budget deleted' })
  })

  describe('Component Rendering', () => {
    it('should render budgets page header', () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      expect(screen.getByText('Budget Management')).toBeInTheDocument()
      expect(screen.getByText('Create and manage your spending budgets')).toBeInTheDocument()
    })

    it('should render create budget button', () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      expect(screen.getByText('Create Budget')).toBeInTheDocument()
    })

    it('should render budget components', () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      expect(screen.getByTestId('budget-suggestions')).toBeInTheDocument()
      expect(screen.getByTestId('budget-recommendations')).toBeInTheDocument()
    })
  })

  describe('Data Loading', () => {
    it('should load budgets and spending summary on mount when user is authenticated', async () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(budgetService.getBudgets).toHaveBeenCalled()
        expect(budgetService.getSpendingSummary).toHaveBeenCalled()
      })
    })

    it('should not load data when user is not authenticated', () => {
      renderWithAuth(<Budgets />, { user: null })

      expect(budgetService.getBudgets).not.toHaveBeenCalled()
      expect(budgetService.getSpendingSummary).not.toHaveBeenCalled()
    })

    it('should display budget cards after loading', async () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
        expect(screen.getByText('Transportation')).toBeInTheDocument()
        expect(screen.getByText('Amount: $500')).toBeInTheDocument()
        expect(screen.getByText('Amount: $200')).toBeInTheDocument()
      })
    })

    it('should pass data to child components', async () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Budget Charts: 2 budgets')).toBeInTheDocument()
        expect(screen.getByTestId('has-spending-summary')).toBeInTheDocument()
      })
    })

    it('should show loading state', async () => {
      // Make getBudgets take some time
      budgetService.getBudgets.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ budgets: mockBudgets }), 100))
      )

      renderWithAuth(<Budgets />, { user: mockUser })

      // Should show loading initially
      expect(screen.getByTestId('loading-state')).toBeInTheDocument()

      // Should hide loading after data loads
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle budget loading errors', async () => {
      const error = new Error('Failed to load budgets')
      budgetService.getBudgets.mockRejectedValueOnce(error)

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Failed to load budgets. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle spending summary loading errors gracefully', async () => {
      budgetService.getSpendingSummary.mockRejectedValueOnce(new Error('Summary error'))

      renderWithAuth(<Budgets />, { user: mockUser })

      // Should still load budgets even if summary fails
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
        expect(screen.getByText('Transportation')).toBeInTheDocument()
      })
    })

    it('should display error message with retry option', async () => {
      budgetService.getBudgets.mockRejectedValueOnce(new Error('Network error'))

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Failed to load budgets. Please try again.')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should retry loading when retry button is clicked', async () => {
      budgetService.getBudgets
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ budgets: mockBudgets })

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(budgetService.getBudgets).toHaveBeenCalledTimes(2)
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })
    })
  })

  describe('Budget Creation', () => {
    it('should open modal when create budget button is clicked', async () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      fireEvent.click(screen.getByText('Create Budget'))

      expect(screen.getByTestId('budget-modal')).toBeInTheDocument()
      expect(screen.getByText('Creating new budget')).toBeInTheDocument()
    })

    it('should create budget when modal save is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(<Budgets />, { user: mockUser })

      await user.click(screen.getByText('Create Budget'))

      expect(screen.getByTestId('budget-modal')).toBeInTheDocument()

      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(budgetService.createBudget).toHaveBeenCalledWith({
          name: 'Test Budget',
          amount: 500
        })
      })
    })

    it('should close modal and refresh budgets after successful creation', async () => {
      const user = userEvent.setup()
      renderWithAuth(<Budgets />, { user: mockUser })

      await user.click(screen.getByText('Create Budget'))
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(screen.queryByTestId('budget-modal')).not.toBeInTheDocument()
        expect(budgetService.getBudgets).toHaveBeenCalledTimes(2) // Initial load + after creation
      })
    })

    it('should show success message after creating budget', async () => {
      const user = userEvent.setup()
      renderWithAuth(<Budgets />, { user: mockUser })

      await user.click(screen.getByText('Create Budget'))
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(screen.getByText('Budget created successfully!')).toBeInTheDocument()
      })
    })

    it('should handle budget creation errors', async () => {
      budgetService.createBudget.mockRejectedValueOnce(new Error('Creation failed'))
      const user = userEvent.setup()

      renderWithAuth(<Budgets />, { user: mockUser })

      await user.click(screen.getByText('Create Budget'))
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(screen.getByText('Failed to create budget. Please try again.')).toBeInTheDocument()
      })
    })

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAuth(<Budgets />, { user: mockUser })

      await user.click(screen.getByText('Create Budget'))
      expect(screen.getByTestId('budget-modal')).toBeInTheDocument()

      await user.click(screen.getByText('Close Modal'))
      expect(screen.queryByTestId('budget-modal')).not.toBeInTheDocument()
    })
  })

  describe('Budget Editing', () => {
    beforeEach(async () => {
      renderWithAuth(<Budgets />, { user: mockUser })
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })
    })

    it('should open modal with budget data when edit is clicked', async () => {
      const user = userEvent.setup()
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(screen.getByTestId('budget-modal')).toBeInTheDocument()
      expect(screen.getByText('Editing: Groceries')).toBeInTheDocument()
    })

    it('should update budget when modal save is clicked during edit', async () => {
      const user = userEvent.setup()
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(budgetService.updateBudget).toHaveBeenCalledWith('budget-1', {
          name: 'Test Budget',
          amount: 500
        })
      })
    })

    it('should show success message after updating budget', async () => {
      const user = userEvent.setup()
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(screen.getByText('Budget updated successfully!')).toBeInTheDocument()
      })
    })

    it('should handle budget update errors', async () => {
      budgetService.updateBudget.mockRejectedValueOnce(new Error('Update failed'))
      const user = userEvent.setup()

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(screen.getByText('Failed to update budget. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Budget Deletion', () => {
    beforeEach(async () => {
      renderWithAuth(<Budgets />, { user: mockUser })
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })
    })

    it('should delete budget when delete button is clicked', async () => {
      const user = userEvent.setup()
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(budgetService.deleteBudget).toHaveBeenCalledWith('budget-1')
      })
    })

    it('should refresh budgets after successful deletion', async () => {
      const user = userEvent.setup()
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(budgetService.getBudgets).toHaveBeenCalledTimes(2) // Initial load + after deletion
      })
    })

    it('should show success message after deleting budget', async () => {
      const user = userEvent.setup()
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Budget deleted successfully!')).toBeInTheDocument()
      })
    })

    it('should handle budget deletion errors', async () => {
      budgetService.deleteBudget.mockRejectedValueOnce(new Error('Delete failed'))
      const user = userEvent.setup()

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Failed to delete budget. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Success Message Management', () => {
    it('should clear success message after 3 seconds', async () => {
      vi.useFakeTimers()
      const user = userEvent.setup()
      
      renderWithAuth(<Budgets />, { user: mockUser })

      await user.click(screen.getByText('Create Budget'))
      await user.click(screen.getByText('Save Budget'))

      await waitFor(() => {
        expect(screen.getByText('Budget created successfully!')).toBeInTheDocument()
      })

      // Fast forward 3 seconds
      vi.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(screen.queryByText('Budget created successfully!')).not.toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(budgetService.getBudgets).toHaveBeenCalledTimes(1)
      })

      fireEvent.click(screen.getByText('Refresh'))

      await waitFor(() => {
        expect(budgetService.getBudgets).toHaveBeenCalledTimes(2)
        expect(budgetService.getSpendingSummary).toHaveBeenCalledTimes(2)
      })
    })

    it('should show loading state during refresh', async () => {
      budgetService.getBudgets
        .mockResolvedValueOnce({ budgets: mockBudgets }) // Initial load
        .mockImplementation(() => // Refresh load
          new Promise(resolve => setTimeout(() => resolve({ budgets: mockBudgets }), 100))
        )

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Refresh'))

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no budgets exist', async () => {
      budgetService.getBudgets.mockResolvedValueOnce({ budgets: [] })

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('No budgets created yet')).toBeInTheDocument()
        expect(screen.getByText('Create your first budget to start tracking your spending')).toBeInTheDocument()
      })
    })

    it('should still show components in empty state', async () => {
      budgetService.getBudgets.mockResolvedValueOnce({ budgets: [] })

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByTestId('budget-suggestions')).toBeInTheDocument()
        expect(screen.getByTestId('budget-recommendations')).toBeInTheDocument()
        expect(screen.getByText('Budget Charts: 0 budgets')).toBeInTheDocument()
      })
    })
  })

  describe('Budget Summary Display', () => {
    beforeEach(async () => {
      renderWithAuth(<Budgets />, { user: mockUser })
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })
    })

    it('should display budget summary cards', () => {
      expect(screen.getByText('Total Budget')).toBeInTheDocument()
      expect(screen.getByText('$700')).toBeInTheDocument()
      expect(screen.getByText('Total Spent')).toBeInTheDocument()
      expect(screen.getByText('$400')).toBeInTheDocument()
      expect(screen.getByText('Remaining')).toBeInTheDocument()
      expect(screen.getByText('$300')).toBeInTheDocument()
    })

    it('should calculate percentage correctly', () => {
      // 400/700 = 57.14%
      expect(screen.getByText('57.1% used')).toBeInTheDocument()
    })

    it('should handle division by zero in percentage calculation', async () => {
      budgetService.getSpendingSummary.mockResolvedValueOnce({
        totalBudget: 0,
        totalSpent: 0,
        categories: {},
      })

      renderWithAuth(<Budgets />, { user: mockUser })

      await waitFor(() => {
        expect(screen.getByText('0.0% used')).toBeInTheDocument()
      })
    })
  })
})