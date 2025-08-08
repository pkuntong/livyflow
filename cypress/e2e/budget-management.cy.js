describe('Budget Management Flow', () => {
  beforeEach(() => {
    // Login and mock APIs
    cy.mockBudgetApi()
    cy.mockPlaidApi()
    cy.login()
    cy.navigateToPage('budgets')
  })

  describe('Budget Creation', () => {
    it('should create a new budget successfully', () => {
      cy.contains('Budget Management').should('be.visible')
      
      // Click create budget button
      cy.get('[data-testid="create-budget-button"]').click()
      
      // Verify modal opens
      cy.get('[data-testid="budget-modal"]').should('be.visible')
      cy.contains('Create New Budget').should('be.visible')
      
      // Fill out budget form
      const budgetData = {
        name: 'Groceries',
        category: 'Food & Drink',
        amount: 500,
        period: 'monthly'
      }
      
      cy.get('[data-testid="budget-name-input"]').type(budgetData.name)
      cy.get('[data-testid="budget-category-select"]').select(budgetData.category)
      cy.get('[data-testid="budget-amount-input"]').type(budgetData.amount.toString())
      cy.get('[data-testid="budget-period-select"]').select(budgetData.period)
      
      // Add description (optional)
      cy.get('[data-testid="budget-description-input"]').type('Monthly grocery budget for household expenses')
      
      // Save budget
      cy.get('[data-testid="save-budget-button"]').click()
      
      // Verify success
      cy.contains('Budget created successfully').should('be.visible')
      cy.get('[data-testid="budget-modal"]').should('not.exist')
      
      // Verify budget appears in the list
      cy.verifyBudgetCard(budgetData)
      
      // Verify budget appears in summary
      cy.get('[data-testid="budget-summary"]').within(() => {
        cy.contains(`$${budgetData.amount}`).should('be.visible')
      })
    })
    
    it('should validate required fields when creating budget', () => {
      cy.get('[data-testid="create-budget-button"]').click()
      
      // Try to save without filling required fields
      cy.get('[data-testid="save-budget-button"]').click()
      
      // Should show validation errors
      cy.contains('Budget name is required').should('be.visible')
      cy.contains('Category is required').should('be.visible')
      cy.contains('Amount is required').should('be.visible')
      
      // Modal should remain open
      cy.get('[data-testid="budget-modal"]').should('be.visible')
    })
    
    it('should validate budget amount constraints', () => {
      cy.get('[data-testid="create-budget-button"]').click()
      
      // Test negative amount
      cy.get('[data-testid="budget-amount-input"]').type('-100')
      cy.get('[data-testid="save-budget-button"]').click()
      cy.contains('Amount must be greater than 0').should('be.visible')
      
      // Test zero amount
      cy.get('[data-testid="budget-amount-input"]').clear().type('0')
      cy.get('[data-testid="save-budget-button"]').click()
      cy.contains('Amount must be greater than 0').should('be.visible')
      
      // Test very large amount
      cy.get('[data-testid="budget-amount-input"]').clear().type('999999999')
      cy.get('[data-testid="save-budget-button"]').click()
      cy.contains('Amount cannot exceed $1,000,000').should('be.visible')
    })
    
    it('should prevent duplicate budget names', () => {
      // Create first budget
      cy.createBudget({ name: 'Unique Budget', amount: 300 })
      
      // Try to create another budget with the same name
      cy.get('[data-testid="create-budget-button"]').click()
      cy.get('[data-testid="budget-name-input"]').type('Unique Budget')
      cy.get('[data-testid="budget-category-select"]').select('Entertainment')
      cy.get('[data-testid="budget-amount-input"]').type('200')
      cy.get('[data-testid="save-budget-button"]').click()
      
      cy.contains('A budget with this name already exists').should('be.visible')
    })
    
    it('should support different budget periods', () => {
      const periods = ['weekly', 'monthly', 'quarterly', 'yearly']
      
      periods.forEach((period, index) => {
        cy.get('[data-testid="create-budget-button"]').click()
        
        cy.get('[data-testid="budget-name-input"]').type(`${period} Budget`)
        cy.get('[data-testid="budget-category-select"]').select('Entertainment')
        cy.get('[data-testid="budget-amount-input"]').type('100')
        cy.get('[data-testid="budget-period-select"]').select(period)
        
        cy.get('[data-testid="save-budget-button"]').click()
        
        cy.contains('Budget created successfully').should('be.visible')
        cy.contains(`${period} Budget`).should('be.visible')
      })
    })
  })
  
  describe('Budget Editing', () => {
    beforeEach(() => {
      // Create a budget to edit
      cy.createBudget({ name: 'Test Budget', amount: 400, category: 'Shopping' })
    })
    
    it('should edit an existing budget', () => {
      // Find and click edit button
      cy.contains('[data-testid="budget-card"]', 'Test Budget').within(() => {
        cy.get('[data-testid="edit-budget-button"]').click()
      })
      
      // Modal should open with existing data
      cy.get('[data-testid="budget-modal"]').should('be.visible')
      cy.contains('Edit Budget').should('be.visible')
      cy.get('[data-testid="budget-name-input"]').should('have.value', 'Test Budget')
      cy.get('[data-testid="budget-amount-input"]').should('have.value', '400')
      
      // Make changes
      cy.get('[data-testid="budget-name-input"]').clear().type('Updated Test Budget')
      cy.get('[data-testid="budget-amount-input"]').clear().type('600')
      cy.get('[data-testid="budget-category-select"]').select('Entertainment')
      
      // Save changes
      cy.get('[data-testid="save-budget-button"]').click()
      
      // Verify success
      cy.contains('Budget updated successfully').should('be.visible')
      
      // Verify changes are reflected
      cy.contains('Updated Test Budget').should('be.visible')
      cy.contains('$600').should('be.visible')
      cy.contains('Entertainment').should('be.visible')
    })
    
    it('should cancel editing without saving changes', () => {
      cy.contains('[data-testid="budget-card"]', 'Test Budget').within(() => {
        cy.get('[data-testid="edit-budget-button"]').click()
      })
      
      // Make changes
      cy.get('[data-testid="budget-name-input"]').clear().type('Changed Name')
      
      // Cancel
      cy.get('[data-testid="cancel-button"]').click()
      
      // Modal should close and original data should remain
      cy.get('[data-testid="budget-modal"]').should('not.exist')
      cy.contains('Test Budget').should('be.visible')
      cy.contains('Changed Name').should('not.exist')
    })
  })
  
  describe('Budget Deletion', () => {
    beforeEach(() => {
      cy.createBudget({ name: 'Budget to Delete', amount: 200 })
    })
    
    it('should delete a budget with confirmation', () => {
      cy.contains('[data-testid="budget-card"]', 'Budget to Delete').within(() => {
        cy.get('[data-testid="delete-budget-button"]').click()
      })
      
      // Should show confirmation dialog
      cy.get('[data-testid="confirmation-modal"]').should('be.visible')
      cy.contains('Delete Budget').should('be.visible')
      cy.contains('Are you sure you want to delete this budget?').should('be.visible')
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click()
      
      // Verify success
      cy.contains('Budget deleted successfully').should('be.visible')
      
      // Verify budget is removed from list
      cy.contains('Budget to Delete').should('not.exist')
    })
    
    it('should cancel budget deletion', () => {
      cy.contains('[data-testid="budget-card"]', 'Budget to Delete').within(() => {
        cy.get('[data-testid="delete-budget-button"]').click()
      })
      
      // Cancel deletion
      cy.get('[data-testid="cancel-delete-button"]').click()
      
      // Modal should close and budget should remain
      cy.get('[data-testid="confirmation-modal"]').should('not.exist')
      cy.contains('Budget to Delete').should('be.visible')
    })
    
    it('should handle budget deletion with associated transactions', () => {
      // This budget has transactions associated with it
      cy.createBudget({ name: 'Budget with Transactions', amount: 300, category: 'Food & Drink' })
      
      cy.contains('[data-testid="budget-card"]', 'Budget with Transactions').within(() => {
        cy.get('[data-testid="delete-budget-button"]').click()
      })
      
      // Should show warning about associated transactions
      cy.contains('This budget has associated transactions').should('be.visible')
      cy.contains('Deleting this budget will not delete the transactions').should('be.visible')
      
      cy.get('[data-testid="confirm-delete-button"]').click()
      cy.contains('Budget deleted successfully').should('be.visible')
    })
  })
  
  describe('Budget Categories', () => {
    it('should display predefined categories', () => {
      cy.get('[data-testid="create-budget-button"]').click()
      
      cy.get('[data-testid="budget-category-select"]').click()
      
      // Verify common categories are available
      const expectedCategories = [
        'Food & Drink',
        'Transportation', 
        'Shopping',
        'Entertainment',
        'Bills & Utilities',
        'Healthcare',
        'Travel',
        'Education',
        'Personal Care',
        'Other'
      ]
      
      expectedCategories.forEach(category => {
        cy.get('[data-testid="budget-category-select"]').should('contain', category)
      })
    })
    
    it('should allow custom category creation', () => {
      cy.get('[data-testid="create-budget-button"]').click()
      
      cy.get('[data-testid="budget-category-select"]').select('Other')
      cy.get('[data-testid="custom-category-input"]').should('be.visible')
      cy.get('[data-testid="custom-category-input"]').type('Pet Expenses')
      
      // Complete budget creation
      cy.get('[data-testid="budget-name-input"]').type('Pet Budget')
      cy.get('[data-testid="budget-amount-input"]').type('150')
      cy.get('[data-testid="save-budget-button"]').click()
      
      // Verify custom category is used
      cy.contains('Budget created successfully').should('be.visible')
      cy.contains('Pet Expenses').should('be.visible')
    })
  })
  
  describe('Budget Analytics', () => {
    beforeEach(() => {
      // Create multiple budgets with different spending levels
      cy.createBudget({ name: 'Groceries', amount: 500, category: 'Food & Drink' })
      cy.createBudget({ name: 'Gas', amount: 200, category: 'Transportation' })
      cy.createBudget({ name: 'Movies', amount: 100, category: 'Entertainment' })
    })
    
    it('should display budget summary cards', () => {
      cy.get('[data-testid="budget-summary"]').should('be.visible')
      
      // Check summary metrics
      cy.get('[data-testid="total-budget"]').should('contain', '$800') // 500 + 200 + 100
      cy.get('[data-testid="total-spent"]').should('be.visible')
      cy.get('[data-testid="remaining-budget"]').should('be.visible')
      cy.get('[data-testid="budget-utilization"]').should('be.visible')
    })
    
    it('should show budget progress bars', () => {
      cy.get('[data-testid="budget-card"]').each(($card) => {
        cy.wrap($card).within(() => {
          cy.get('[data-testid="progress-bar"]').should('be.visible')
          cy.get('[data-testid="progress-percentage"]').should('be.visible')
        })
      })
    })
    
    it('should highlight over-budget items', () => {
      // Mock a budget that's over spent
      cy.intercept('GET', '**/api/v1/budgets/spending-summary', {
        statusCode: 200,
        body: {
          totalBudget: 800,
          totalSpent: 850, // Over budget
          categories: {
            'Food & Drink': { budgeted: 500, spent: 600 }, // Over budget
            'Transportation': { budgeted: 200, spent: 150 },
            'Entertainment': { budgeted: 100, spent: 100 },
          }
        }
      }).as('getOverBudgetSummary')
      
      cy.reload()
      cy.wait('@getOverBudgetSummary')
      
      // Should highlight over-budget items
      cy.contains('[data-testid="budget-card"]', 'Groceries').within(() => {
        cy.get('[data-testid="progress-bar"]').should('have.class', 'bg-red-500')
        cy.contains('Over budget').should('be.visible')
      })
      
      // Should show warning in summary
      cy.get('[data-testid="budget-summary"]').within(() => {
        cy.contains('You are $50 over budget').should('be.visible')
        cy.get('[data-testid="over-budget-warning"]').should('be.visible')
      })
    })
  })
  
  describe('Budget Suggestions', () => {
    it('should display AI-powered budget suggestions', () => {
      cy.get('[data-testid="budget-suggestions"]').should('be.visible')
      cy.contains('Budget Suggestions').should('be.visible')
      
      // Should show suggestions based on spending patterns
      cy.get('[data-testid="suggestion-card"]').should('have.length.greaterThan', 0)
      
      cy.get('[data-testid="suggestion-card"]').first().within(() => {
        cy.get('[data-testid="suggestion-category"]').should('be.visible')
        cy.get('[data-testid="suggestion-amount"]').should('be.visible')
        cy.get('[data-testid="suggestion-reason"]').should('be.visible')
        cy.get('[data-testid="apply-suggestion-button"]').should('be.visible')
      })
    })
    
    it('should apply a budget suggestion', () => {
      cy.get('[data-testid="suggestion-card"]').first().within(() => {
        cy.get('[data-testid="apply-suggestion-button"]').click()
      })
      
      // Should open budget modal with pre-filled data from suggestion
      cy.get('[data-testid="budget-modal"]').should('be.visible')
      cy.get('[data-testid="budget-name-input"]').should('not.be.empty')
      cy.get('[data-testid="budget-amount-input"]').should('not.be.empty')
      
      // Complete the budget creation
      cy.get('[data-testid="save-budget-button"]').click()
      
      cy.contains('Budget created successfully').should('be.visible')
    })
    
    it('should dismiss budget suggestions', () => {
      const initialSuggestionCount = cy.get('[data-testid="suggestion-card"]').should('have.length.greaterThan', 0)
      
      cy.get('[data-testid="suggestion-card"]').first().within(() => {
        cy.get('[data-testid="dismiss-suggestion-button"]').click()
      })
      
      // Suggestion should be removed
      cy.get('[data-testid="suggestion-card"]').should('have.length.lessThan', initialSuggestionCount)
    })
  })
  
  describe('Budget Performance Tracking', () => {
    it('should display spending trends chart', () => {
      cy.get('[data-testid="budget-charts"]').should('be.visible')
      cy.get('[data-testid="spending-trends-chart"]').should('be.visible')
      
      // Should show data for the current period
      cy.contains('This Month').should('be.visible')
      cy.get('[data-testid="chart-legend"]').should('be.visible')
    })
    
    it('should allow switching between time periods', () => {
      const periods = ['This Week', 'This Month', 'This Quarter', 'This Year']
      
      periods.forEach(period => {
        cy.get('[data-testid="period-selector"]').select(period)
        cy.contains(period).should('be.visible')
        
        // Chart should update with new data
        cy.get('[data-testid="spending-trends-chart"]').should('be.visible')
      })
    })
    
    it('should display category breakdown chart', () => {
      cy.get('[data-testid="category-breakdown-chart"]').should('be.visible')
      
      // Should show each budget category
      cy.get('[data-testid="chart-segment"]').should('have.length.greaterThan', 0)
      
      // Should show percentages and amounts
      cy.get('[data-testid="category-legend"]').within(() => {
        cy.contains('%').should('be.visible')
        cy.contains('$').should('be.visible')
      })
    })
  })
  
  describe('Budget Notifications', () => {
    it('should show alerts for budgets nearing limits', () => {
      // Mock spending data that triggers alerts
      cy.intercept('GET', '**/api/v1/budgets/spending-summary', {
        statusCode: 200,
        body: {
          categories: {
            'Food & Drink': { budgeted: 500, spent: 450 }, // 90% spent
            'Transportation': { budgeted: 200, spent: 100 }, // 50% spent
          }
        }
      }).as('getHighSpendingSummary')
      
      cy.reload()
      cy.wait('@getHighSpendingSummary')
      
      // Should show warning for high spending
      cy.contains('[data-testid="budget-card"]', 'Groceries').within(() => {
        cy.get('[data-testid="warning-icon"]').should('be.visible')
        cy.contains('90% used').should('be.visible')
      })
      
      // Should show alert notification
      cy.get('[data-testid="budget-alert"]').should('be.visible')
      cy.contains('You are approaching your Groceries budget limit').should('be.visible')
    })
    
    it('should allow setting custom alert thresholds', () => {
      cy.contains('[data-testid="budget-card"]', 'Groceries').within(() => {
        cy.get('[data-testid="budget-settings-button"]').click()
      })
      
      cy.get('[data-testid="alert-settings-modal"]').should('be.visible')
      
      // Set custom alert threshold
      cy.get('[data-testid="alert-threshold-slider"]').invoke('val', 75).trigger('change')
      cy.contains('75%').should('be.visible')
      
      cy.get('[data-testid="save-alert-settings-button"]').click()
      
      cy.contains('Alert settings updated').should('be.visible')
    })
  })
  
  describe('Accessibility and Usability', () => {
    it('should support keyboard navigation', () => {
      // Navigate through budget cards with keyboard
      cy.get('[data-testid="budget-card"]').first().focus()
      cy.focused().should('have.attr', 'data-testid', 'budget-card')
      
      // Tab through interactive elements
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'edit-budget-button')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'delete-budget-button')
    })
    
    it('should have proper ARIA labels for screen readers', () => {
      cy.get('[data-testid="budget-card"]').first().within(() => {
        cy.get('[data-testid="progress-bar"]').should('have.attr', 'role', 'progressbar')
        cy.get('[data-testid="progress-bar"]').should('have.attr', 'aria-valuenow')
        cy.get('[data-testid="progress-bar"]').should('have.attr', 'aria-valuemax')
      })
    })
    
    it('should provide clear visual feedback for actions', () => {
      cy.get('[data-testid="create-budget-button"]').click()
      
      // Loading states
      cy.get('[data-testid="save-budget-button"]').should('not.be.disabled')
      
      // Fill form and submit
      cy.get('[data-testid="budget-name-input"]').type('Visual Feedback Test')
      cy.get('[data-testid="budget-category-select"]').select('Entertainment')
      cy.get('[data-testid="budget-amount-input"]').type('200')
      
      cy.get('[data-testid="save-budget-button"]').click()
      
      // Should show loading state
      cy.get('[data-testid="save-budget-button"]').should('contain', 'Saving...')
      cy.get('[data-testid="save-budget-button"]').should('be.disabled')
      
      // Should show success state
      cy.contains('Budget created successfully').should('be.visible')
      cy.get('[data-testid="success-icon"]').should('be.visible')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '**/api/v1/budgets', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('createBudgetError')
      
      cy.get('[data-testid="create-budget-button"]').click()
      
      cy.get('[data-testid="budget-name-input"]').type('Error Test Budget')
      cy.get('[data-testid="budget-category-select"]').select('Entertainment')
      cy.get('[data-testid="budget-amount-input"]').type('200')
      
      cy.get('[data-testid="save-budget-button"]').click()
      cy.wait('@createBudgetError')
      
      // Should show error message
      cy.contains('Failed to create budget').should('be.visible')
      cy.contains('Please try again').should('be.visible')
      
      // Modal should remain open for retry
      cy.get('[data-testid="budget-modal"]').should('be.visible')
    })
    
    it('should recover from network errors', () => {
      // Simulate network failure
      cy.intercept('GET', '**/api/v1/budgets', { forceNetworkError: true }).as('networkError')
      
      cy.reload()
      cy.wait('@networkError')
      
      // Should show error state with retry option
      cy.contains('Unable to load budgets').should('be.visible')
      cy.get('[data-testid="retry-button"]').should('be.visible')
      
      // Fix network and retry
      cy.mockBudgetApi()
      cy.get('[data-testid="retry-button"]').click()
      
      // Should successfully load budgets
      cy.contains('Budget Management').should('be.visible')
      cy.get('[data-testid="budget-card"]').should('exist')
    })
  })
})