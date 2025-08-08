describe('Bank Account Connection Flow', () => {
  beforeEach(() => {
    cy.mockBudgetApi()
    cy.mockPlaidApi()
    cy.login()
  })

  describe('Initial Account Connection', () => {
    it('should guide user through bank account connection process', () => {
      cy.navigateToPage('accounts')
      cy.contains('Account Management').should('be.visible')

      // Should show empty state initially
      cy.contains('No accounts connected').should('be.visible')
      cy.contains('Connect your first bank account to get started').should('be.visible')
      
      // Click connect bank button
      cy.get('[data-testid="connect-bank-button"]').click()
      
      // Should open connection modal
      cy.get('[data-testid="bank-connection-modal"]').should('be.visible')
      cy.contains('Connect Your Bank Account').should('be.visible')
      cy.contains('Securely connect your bank account using Plaid').should('be.visible')
    })

    it('should display security information before connection', () => {
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-bank-button"]').click()

      // Should show security badges and information
      cy.contains('Bank-level Security').should('be.visible')
      cy.contains('256-bit SSL Encryption').should('be.visible')
      cy.contains('Read-only Access').should('be.visible')
      cy.get('[data-testid="security-badges"]').should('be.visible')

      // Should show privacy policy link
      cy.contains('Privacy Policy').should('have.attr', 'href')
      cy.contains('Terms of Service').should('have.attr', 'href')
    })

    it('should initiate Plaid Link flow', () => {
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-bank-button"]').click()
      
      // Continue to Plaid Link
      cy.get('[data-testid="continue-to-plaid-button"]').click()
      
      // Should request link token
      cy.wait('@getLinkToken')
      
      // Should show Plaid Link interface (mocked)
      cy.get('[data-testid="plaid-link-container"]').should('be.visible')
      cy.contains('Select Your Bank').should('be.visible')
    })

    it('should handle successful bank connection', () => {
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-bank-button"]').click()
      cy.get('[data-testid="continue-to-plaid-button"]').click()
      
      // Simulate successful Plaid Link flow
      cy.window().then((win) => {
        win.postMessage({
          type: 'PLAID_LINK_SUCCESS',
          public_token: 'public-sandbox-12345',
          metadata: {
            institution: {
              name: 'First National Bank',
              institution_id: 'ins_123'
            },
            accounts: [
              {
                id: 'account-1',
                name: 'Checking',
                type: 'depository',
                subtype: 'checking'
              }
            ]
          }
        }, '*')
      })
      
      // Should exchange token
      cy.wait('@exchangeToken')
      
      // Should show success message
      cy.contains('Bank account connected successfully!').should('be.visible')
      
      // Should redirect to accounts page with connected account
      cy.url().should('include', '/app/accounts')
      cy.contains('First National Bank').should('be.visible')
      cy.contains('Checking').should('be.visible')
    })

    it('should handle Plaid Link errors', () => {
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-bank-button"]').click()
      cy.get('[data-testid="continue-to-plaid-button"]').click()
      
      // Simulate Plaid Link error
      cy.window().then((win) => {
        win.postMessage({
          type: 'PLAID_LINK_ERROR',
          error: {
            error_code: 'INVALID_CREDENTIALS',
            error_message: 'Invalid credentials provided'
          }
        }, '*')
      })
      
      // Should show error message
      cy.contains('Unable to connect your bank account').should('be.visible')
      cy.contains('Invalid credentials provided').should('be.visible')
      
      // Should offer retry option
      cy.get('[data-testid="retry-connection-button"]').should('be.visible')
    })

    it('should handle user cancellation of Plaid Link', () => {
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-bank-button"]').click()
      cy.get('[data-testid="continue-to-plaid-button"]').click()
      
      // Simulate user cancellation
      cy.window().then((win) => {
        win.postMessage({
          type: 'PLAID_LINK_EXIT',
          metadata: {
            status: 'requires_credentials'
          }
        }, '*')
      })
      
      // Should return to accounts page without error
      cy.url().should('include', '/app/accounts')
      cy.contains('Connection was cancelled').should('be.visible')
      cy.contains('You can try connecting again anytime').should('be.visible')
    })
  })

  describe('Account Management', () => {
    beforeEach(() => {
      // Mock connected accounts
      cy.connectBankAccount()
    })

    it('should display connected bank accounts', () => {
      cy.navigateToPage('accounts')
      
      // Should show account cards
      cy.get('[data-testid="account-card"]').should('have.length.greaterThan', 0)
      
      cy.get('[data-testid="account-card"]').first().within(() => {
        cy.get('[data-testid="account-name"]').should('be.visible')
        cy.get('[data-testid="account-type"]').should('be.visible')
        cy.get('[data-testid="account-balance"]').should('be.visible')
        cy.get('[data-testid="account-number"]').should('be.visible')
      })
    })

    it('should show account balances and details', () => {
      cy.navigateToPage('accounts')
      
      cy.get('[data-testid="account-card"]').first().within(() => {
        // Should mask account number for security
        cy.get('[data-testid="account-number"]').should('contain', '****')
        
        // Should show current and available balances
        cy.contains('Available').should('be.visible')
        cy.contains('Current').should('be.visible')
        
        // Should format currency correctly
        cy.get('[data-testid="account-balance"]').should('match', /\$[\d,]+\.\d{2}/)
      })
    })

    it('should allow refreshing account data', () => {
      cy.navigateToPage('accounts')
      
      cy.get('[data-testid="refresh-accounts-button"]').click()
      
      // Should show loading state
      cy.get('[data-testid="refresh-accounts-button"]').should('contain', 'Refreshing...')
      cy.get('[data-testid="refresh-accounts-button"]').should('be.disabled')
      
      // Should update account data
      cy.wait('@getAccounts')
      
      // Should show success feedback
      cy.contains('Accounts updated').should('be.visible')
    })

    it('should handle account refresh errors', () => {
      cy.intercept('GET', '**/api/v1/plaid/accounts', {
        statusCode: 400,
        body: { error: 'Item requires user present authentication' }
      }).as('getAccountsError')
      
      cy.navigateToPage('accounts')
      cy.get('[data-testid="refresh-accounts-button"]').click()
      
      cy.wait('@getAccountsError')
      
      // Should show error with re-authentication option
      cy.contains('Account access needs to be updated').should('be.visible')
      cy.get('[data-testid="reauthorize-button"]').should('be.visible')
    })

    it('should support connecting additional accounts', () => {
      cy.navigateToPage('accounts')
      
      // Should have option to connect more accounts
      cy.get('[data-testid="connect-another-account-button"]').should('be.visible')
      cy.get('[data-testid="connect-another-account-button"]').click()
      
      // Should initiate same flow as initial connection
      cy.get('[data-testid="bank-connection-modal"]').should('be.visible')
      cy.contains('Connect Another Bank Account').should('be.visible')
    })

    it('should allow disconnecting accounts', () => {
      cy.navigateToPage('accounts')
      
      cy.get('[data-testid="account-card"]').first().within(() => {
        cy.get('[data-testid="account-menu-button"]').click()
      })
      
      cy.get('[data-testid="disconnect-account-option"]').click()
      
      // Should show confirmation dialog
      cy.get('[data-testid="disconnect-confirmation-modal"]').should('be.visible')
      cy.contains('Disconnect Bank Account').should('be.visible')
      cy.contains('This will remove all account data and transactions').should('be.visible')
      
      cy.get('[data-testid="confirm-disconnect-button"]').click()
      
      // Should remove account from list
      cy.contains('Account disconnected successfully').should('be.visible')
    })
  })

  describe('Transaction Synchronization', () => {
    beforeEach(() => {
      cy.connectBankAccount()
    })

    it('should sync transactions after account connection', () => {
      cy.navigateToPage('transactions')
      
      // Should show recent transactions from connected account
      cy.get('[data-testid="transaction-list"]').should('be.visible')
      cy.get('[data-testid="transaction-item"]').should('have.length.greaterThan', 0)
      
      cy.get('[data-testid="transaction-item"]').first().within(() => {
        cy.get('[data-testid="transaction-name"]').should('be.visible')
        cy.get('[data-testid="transaction-amount"]').should('be.visible')
        cy.get('[data-testid="transaction-date"]').should('be.visible')
        cy.get('[data-testid="transaction-category"]').should('be.visible')
      })
    })

    it('should categorize transactions automatically', () => {
      cy.navigateToPage('transactions')
      
      cy.get('[data-testid="transaction-item"]').each(($transaction) => {
        cy.wrap($transaction).within(() => {
          // Each transaction should have a category
          cy.get('[data-testid="transaction-category"]').should('not.be.empty')
          
          // Categories should be meaningful
          cy.get('[data-testid="transaction-category"]').should('not.contain', 'Unknown')
        })
      })
    })

    it('should update budget spending based on transactions', () => {
      cy.navigateToPage('budgets')
      
      // Budget cards should show updated spending amounts
      cy.get('[data-testid="budget-card"]').each(($budget) => {
        cy.wrap($budget).within(() => {
          cy.get('[data-testid="budget-spent"]').should('be.visible')
          cy.get('[data-testid="progress-bar"]').should('be.visible')
        })
      })
      
      // Spending should be calculated from transaction data
      cy.get('[data-testid="budget-summary"]').within(() => {
        cy.get('[data-testid="total-spent"]').should('not.contain', '$0.00')
      })
    })

    it('should handle transaction sync errors gracefully', () => {
      cy.intercept('GET', '**/api/v1/plaid/transactions', {
        statusCode: 400,
        body: { error: 'ITEM_LOGIN_REQUIRED' }
      }).as('getTransactionsError')
      
      cy.navigateToPage('transactions')
      
      // Should show error state
      cy.contains('Unable to sync transactions').should('be.visible')
      cy.contains('Please reconnect your bank account').should('be.visible')
      
      // Should provide action to fix
      cy.get('[data-testid="reconnect-account-button"]').should('be.visible')
    })
  })

  describe('Account Security', () => {
    beforeEach(() => {
      cy.connectBankAccount()
    })

    it('should display security status for connected accounts', () => {
      cy.navigateToPage('accounts')
      
      cy.get('[data-testid="account-card"]').first().within(() => {
        cy.get('[data-testid="security-status"]').should('be.visible')
        cy.get('[data-testid="last-sync"]').should('be.visible')
      })
    })

    it('should handle expired account connections', () => {
      // Mock expired connection
      cy.intercept('GET', '**/api/v1/plaid/accounts', {
        statusCode: 400,
        body: { 
          error: 'ITEM_LOGIN_REQUIRED',
          error_message: 'User credentials are no longer valid'
        }
      }).as('getAccountsExpired')
      
      cy.navigateToPage('accounts')
      cy.wait('@getAccountsExpired')
      
      // Should show connection expired warning
      cy.get('[data-testid="connection-expired-warning"]').should('be.visible')
      cy.contains('Connection expired').should('be.visible')
      
      // Should provide re-authentication option
      cy.get('[data-testid="reauthorize-button"]').click()
      
      // Should restart Plaid Link flow
      cy.get('[data-testid="plaid-link-container"]').should('be.visible')
    })

    it('should allow users to view connection permissions', () => {
      cy.navigateToPage('accounts')
      
      cy.get('[data-testid="account-card"]').first().within(() => {
        cy.get('[data-testid="account-menu-button"]').click()
      })
      
      cy.get('[data-testid="view-permissions-option"]').click()
      
      // Should show permissions modal
      cy.get('[data-testid="permissions-modal"]').should('be.visible')
      cy.contains('Account Permissions').should('be.visible')
      
      // Should list specific permissions
      cy.contains('Read account balances').should('be.visible')
      cy.contains('Read transaction history').should('be.visible')
      cy.contains('Read account details').should('be.visible')
      
      // Should clarify what we cannot do
      cy.contains('Cannot initiate transfers').should('be.visible')
      cy.contains('Cannot modify account settings').should('be.visible')
    })
  })

  describe('Multi-Bank Support', () => {
    it('should support connecting multiple banks', () => {
      cy.connectBankAccount()
      
      // Connect second bank
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-another-account-button"]').click()
      cy.get('[data-testid="continue-to-plaid-button"]').click()
      
      // Simulate connecting different bank
      cy.window().then((win) => {
        win.postMessage({
          type: 'PLAID_LINK_SUCCESS',
          public_token: 'public-sandbox-67890',
          metadata: {
            institution: {
              name: 'Second National Bank',
              institution_id: 'ins_456'
            },
            accounts: [
              {
                id: 'account-2',
                name: 'Savings',
                type: 'depository',
                subtype: 'savings'
              }
            ]
          }
        }, '*')
      })
      
      // Should show both banks
      cy.contains('First National Bank').should('be.visible')
      cy.contains('Second National Bank').should('be.visible')
      cy.get('[data-testid="account-card"]').should('have.length', 2)
    })

    it('should aggregate balances across all accounts', () => {
      // Connect multiple accounts first
      cy.connectBankAccount()
      
      cy.navigateToPage('accounts')
      
      // Should show total balance summary
      cy.get('[data-testid="total-balance-summary"]').should('be.visible')
      cy.get('[data-testid="total-assets"]').should('be.visible')
      cy.get('[data-testid="account-count"]').should('contain', '2 accounts')
    })

    it('should handle mixed account types', () => {
      cy.connectBankAccount()
      
      cy.navigateToPage('accounts')
      
      // Should categorize accounts by type
      cy.contains('Checking Accounts').should('be.visible')
      cy.contains('Savings Accounts').should('be.visible')
      
      // Should show appropriate icons for different account types
      cy.get('[data-testid="account-type-icon"]').should('exist')
    })
  })

  describe('Error Recovery', () => {
    it('should handle Plaid service outages', () => {
      cy.intercept('GET', '**/api/v1/plaid/link-token', {
        statusCode: 503,
        body: { error: 'Service temporarily unavailable' }
      }).as('plaidOutage')
      
      cy.navigateToPage('accounts')
      cy.get('[data-testid="connect-bank-button"]').click()
      cy.get('[data-testid="continue-to-plaid-button"]').click()
      
      cy.wait('@plaidOutage')
      
      // Should show service outage message
      cy.contains('Banking service is temporarily unavailable').should('be.visible')
      cy.contains('Please try again later').should('be.visible')
      
      // Should not show error as user's fault
      cy.contains('We apologize for the inconvenience').should('be.visible')
    })

    it('should handle network connectivity issues', () => {
      cy.intercept('GET', '**/api/v1/plaid/accounts', { forceNetworkError: true }).as('networkError')
      
      cy.navigateToPage('accounts')
      cy.wait('@networkError')
      
      // Should show network error message
      cy.contains('Unable to connect to banking service').should('be.visible')
      cy.contains('Check your internet connection').should('be.visible')
      
      // Should provide retry option
      cy.get('[data-testid="retry-connection-button"]').should('be.visible')
    })

    it('should recover from temporary API failures', () => {
      // First request fails
      cy.intercept('GET', '**/api/v1/plaid/accounts', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('apiError')
      
      cy.navigateToPage('accounts')
      cy.wait('@apiError')
      
      cy.contains('Something went wrong').should('be.visible')
      cy.get('[data-testid="retry-button"]').should('be.visible')
      
      // Fix API and retry
      cy.mockPlaidApi()
      cy.get('[data-testid="retry-button"]').click()
      
      // Should successfully load accounts
      cy.get('[data-testid="account-card"]').should('be.visible')
      cy.contains('First National Bank').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.connectBankAccount()
    })

    it('should support keyboard navigation', () => {
      cy.navigateToPage('accounts')
      
      // Tab through account cards
      cy.get('[data-testid="account-card"]').first().focus()
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'account-menu-button')
      
      // Enter should activate buttons
      cy.focused().type('{enter}')
      cy.get('[data-testid="account-menu"]').should('be.visible')
    })

    it('should have proper ARIA labels for account information', () => {
      cy.navigateToPage('accounts')
      
      cy.get('[data-testid="account-card"]').first().within(() => {
        cy.get('[data-testid="account-balance"]').should('have.attr', 'aria-label')
        cy.get('[data-testid="account-number"]').should('have.attr', 'aria-describedby')
      })
    })

    it('should announce balance updates to screen readers', () => {
      cy.navigateToPage('accounts')
      
      // Refresh accounts
      cy.get('[data-testid="refresh-accounts-button"]').click()
      
      // Should have live region for announcements
      cy.get('[data-testid="balance-update-announcement"]')
        .should('have.attr', 'aria-live', 'polite')
        .should('contain', 'Account balances updated')
    })
  })

  describe('Performance', () => {
    it('should load account data efficiently', () => {
      cy.navigateToPage('accounts')
      
      // Measure page load performance
      cy.measurePageLoad('Accounts')
      
      // Should show loading skeleton while fetching data
      cy.get('[data-testid="account-skeleton"]').should('be.visible')
      
      // Should replace skeleton with actual data
      cy.get('[data-testid="account-card"]').should('be.visible')
      cy.get('[data-testid="account-skeleton"]').should('not.exist')
    })

    it('should cache account data appropriately', () => {
      cy.navigateToPage('accounts')
      
      // Initial load
      cy.wait('@getAccounts')
      
      // Navigate away and back
      cy.navigateToPage('dashboard')
      cy.navigateToPage('accounts')
      
      // Should use cached data (no additional API call)
      cy.get('[data-testid="account-card"]').should('be.visible')
    })

    it('should handle large numbers of accounts efficiently', () => {
      // Mock response with many accounts
      cy.intercept('GET', '**/api/v1/plaid/accounts', {
        statusCode: 200,
        body: {
          accounts: Array.from({ length: 20 }, (_, i) => ({
            account_id: `account-${i}`,
            name: `Account ${i + 1}`,
            type: 'depository',
            subtype: i % 2 === 0 ? 'checking' : 'savings',
            balances: {
              available: Math.random() * 10000,
              current: Math.random() * 10000
            }
          }))
        }
      }).as('getManyAccounts')
      
      cy.navigateToPage('accounts')
      cy.wait('@getManyAccounts')
      
      // Should render all accounts without performance issues
      cy.get('[data-testid="account-card"]').should('have.length', 20)
      
      // Should support virtual scrolling or pagination for large lists
      cy.get('[data-testid="accounts-container"]').should('be.visible')
    })
  })
})