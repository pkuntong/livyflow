// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Authentication Commands
Cypress.Commands.add('login', (email, password) => {
  email = email || Cypress.env('testEmail')
  password = password || Cypress.env('testPassword')
  
  cy.visit('/login')
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="login-button"]').click()
  
  // Wait for successful login (redirect to dashboard)
  cy.url().should('include', '/app/dashboard')
  cy.contains('Financial Dashboard').should('be.visible')
})

Cypress.Commands.add('signup', (email, password, displayName) => {
  email = email || `cypress-${Date.now()}@test.com`
  password = password || Cypress.env('testPassword')
  displayName = displayName || 'Cypress Test User'
  
  cy.visit('/signup')
  cy.get('[data-testid="name-input"]').type(displayName)
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="signup-button"]').click()
  
  // Wait for successful signup
  cy.url().should('include', '/app/dashboard')
})

Cypress.Commands.add('logout', () => {
  // Try to find logout button in different possible locations
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="logout-button"]').length > 0) {
      cy.get('[data-testid="logout-button"]').click()
    } else if ($body.find('[data-testid="user-menu"]').length > 0) {
      cy.get('[data-testid="user-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()
    } else {
      // Fallback: clear localStorage and navigate to home
      cy.clearLocalStorage()
      cy.visit('/')
    }
  })
  
  // Verify logout was successful
  cy.url().should('not.include', '/app/')
})

// Navigation Commands
Cypress.Commands.add('navigateToPage', (page) => {
  const pages = {
    dashboard: '/app/dashboard',
    budgets: '/app/budgets',
    transactions: '/app/transactions',
    accounts: '/app/accounts',
    analytics: '/app/analytics',
    settings: '/app/settings',
  }
  
  if (pages[page]) {
    cy.visit(pages[page])
  } else {
    throw new Error(`Unknown page: ${page}`)
  }
})

// Budget Management Commands
Cypress.Commands.add('createBudget', (budgetData) => {
  const defaultBudget = {
    name: 'Test Budget',
    category: 'Food & Drink',
    amount: 500,
    period: 'monthly',
  }
  
  const budget = { ...defaultBudget, ...budgetData }
  
  cy.navigateToPage('budgets')
  cy.get('[data-testid="create-budget-button"]').click()
  
  // Fill budget form
  cy.get('[data-testid="budget-name-input"]').type(budget.name)
  cy.get('[data-testid="budget-category-select"]').select(budget.category)
  cy.get('[data-testid="budget-amount-input"]').type(budget.amount.toString())
  cy.get('[data-testid="budget-period-select"]').select(budget.period)
  
  // Save budget
  cy.get('[data-testid="save-budget-button"]').click()
  
  // Verify success
  cy.contains('Budget created successfully').should('be.visible')
  cy.contains(budget.name).should('be.visible')
  
  return budget
})

Cypress.Commands.add('deleteBudget', (budgetName) => {
  cy.navigateToPage('budgets')
  
  // Find the budget card and click delete
  cy.contains('[data-testid="budget-card"]', budgetName).within(() => {
    cy.get('[data-testid="delete-budget-button"]').click()
  })
  
  // Confirm deletion if confirmation dialog exists
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="confirm-delete-button"]').length > 0) {
      cy.get('[data-testid="confirm-delete-button"]').click()
    }
  })
  
  // Verify deletion
  cy.contains('Budget deleted successfully').should('be.visible')
  cy.contains(budgetName).should('not.exist')
})

// Plaid Integration Commands
Cypress.Commands.add('connectBankAccount', () => {
  cy.navigateToPage('accounts')
  cy.get('[data-testid="connect-bank-button"]').click()
  
  // Handle Plaid Link flow (this will be mocked in testing)
  cy.get('[data-testid="plaid-link-button"]').should('be.visible')
  cy.get('[data-testid="plaid-link-button"]').click()
  
  // In a real test, this would open Plaid Link
  // For testing, we'll simulate successful connection
  cy.window().then((win) => {
    win.postMessage({
      type: 'PLAID_LINK_SUCCESS',
      public_token: 'public-sandbox-token-12345',
      metadata: {
        institution: {
          name: 'Test Bank',
          institution_id: 'ins_test'
        }
      }
    }, '*')
  })
  
  // Verify connection success
  cy.contains('Bank account connected successfully').should('be.visible')
})

// Data Validation Commands
Cypress.Commands.add('verifyBudgetCard', (budgetData) => {
  cy.contains('[data-testid="budget-card"]', budgetData.name).within(() => {
    cy.contains(budgetData.name).should('be.visible')
    cy.contains(`$${budgetData.amount}`).should('be.visible')
    cy.contains(budgetData.category).should('be.visible')
  })
})

Cypress.Commands.add('verifyTransactionInList', (transactionData) => {
  cy.get('[data-testid="transaction-list"]').within(() => {
    cy.contains(transactionData.name).should('be.visible')
    cy.contains(`$${Math.abs(transactionData.amount).toFixed(2)}`).should('be.visible')
  })
})

// API Mocking Commands
Cypress.Commands.add('mockApiResponse', (method, url, response, statusCode = 200) => {
  cy.intercept(method.toUpperCase(), url, {
    statusCode,
    body: response,
  }).as(`mock${method.toUpperCase()}${url.replace(/[^a-zA-Z0-9]/g, '')}`)
})

Cypress.Commands.add('mockBudgetApi', () => {
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
  
  cy.intercept('GET', '**/api/v1/budgets', {
    statusCode: 200,
    body: { budgets: mockBudgets },
  }).as('getBudgets')
  
  cy.intercept('POST', '**/api/v1/budgets', {
    statusCode: 201,
    body: {
      id: 'new-budget-' + Date.now(),
      name: 'New Budget',
      category: 'Entertainment',
      amount: 300,
      spent: 0,
      period: 'monthly',
    },
  }).as('createBudget')
})

Cypress.Commands.add('mockPlaidApi', () => {
  cy.intercept('GET', '**/api/v1/plaid/link-token', {
    statusCode: 200,
    body: { link_token: 'link-sandbox-token-12345' },
  }).as('getLinkToken')
  
  cy.intercept('POST', '**/api/v1/plaid/exchange-token', {
    statusCode: 200,
    body: {
      access_token: 'access-sandbox-token-12345',
      item_id: 'item-12345',
    },
  }).as('exchangeToken')
  
  cy.intercept('GET', '**/api/v1/plaid/accounts', {
    statusCode: 200,
    body: {
      accounts: [
        {
          account_id: 'account-1',
          name: 'Checking Account',
          type: 'depository',
          subtype: 'checking',
          balances: {
            available: 1500.00,
            current: 1500.00,
          },
        },
      ],
    },
  }).as('getAccounts')
  
  cy.intercept('GET', '**/api/v1/plaid/transactions', {
    statusCode: 200,
    body: {
      transactions: [
        {
          transaction_id: 'trans-1',
          name: 'Coffee Shop',
          amount: 4.50,
          date: '2024-01-15',
          category: ['Food and Drink', 'Restaurants'],
          account_id: 'account-1',
        },
      ],
    },
  }).as('getTransactions')
})

// Utility Commands
Cypress.Commands.add('waitForPageLoad', () => {
  // Wait for the main content to be visible
  cy.get('[data-testid="main-content"]', { timeout: 10000 }).should('be.visible')
})

Cypress.Commands.add('skipOnboardingIfPresent', () => {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="skip-onboarding"]').length > 0) {
      cy.get('[data-testid="skip-onboarding"]').click()
    }
  })
})

// Screenshot and debugging commands
Cypress.Commands.add('screenshotAndLog', (name, message) => {
  cy.task('log', `${name}: ${message}`)
  cy.screenshot(name)
})

// Custom assertion commands
Cypress.Commands.add('shouldBeAccessible', { prevSubject: 'element' }, (subject) => {
  // Basic accessibility checks
  cy.wrap(subject).should('be.visible')
  cy.wrap(subject).should('not.have.attr', 'aria-hidden', 'true')
  
  // Check for ARIA labels on interactive elements
  cy.wrap(subject).then(($el) => {
    if ($el.is('button, input, select, textarea, [role="button"], [role="link"]')) {
      expect($el).to.satisfy(($element) => {
        return $element.attr('aria-label') || 
               $element.attr('aria-labelledby') || 
               $element.text().trim().length > 0 ||
               $element.attr('title')
      })
    }
  })
})

// Performance monitoring
Cypress.Commands.add('measurePageLoad', (pageName) => {
  cy.window().then((win) => {
    const startTime = Date.now()
    
    cy.waitForPageLoad().then(() => {
      const loadTime = Date.now() - startTime
      cy.task('log', `${pageName} page load time: ${loadTime}ms`)
      
      // Assert reasonable load time (adjust threshold as needed)
      expect(loadTime).to.be.lessThan(5000)
    })
  })
})