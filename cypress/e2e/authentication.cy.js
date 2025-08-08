describe('Authentication Flow', () => {
  beforeEach(() => {
    // Mock APIs to avoid external dependencies
    cy.mockBudgetApi()
    cy.mockPlaidApi()
  })

  describe('User Registration', () => {
    it('should allow new user to sign up successfully', () => {
      const testUser = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      }

      cy.visit('/')
      cy.contains('Get Started').click()
      
      // Should navigate to signup page
      cy.url().should('include', '/signup')
      cy.contains('Create Your Account').should('be.visible')

      // Fill signup form
      cy.get('[data-testid="name-input"]').type(testUser.name)
      cy.get('[data-testid="email-input"]').type(testUser.email)
      cy.get('[data-testid="password-input"]').type(testUser.password)

      // Verify password requirements are met
      cy.get('[data-testid="password-strength"]').should('contain', 'Strong')

      // Submit form
      cy.get('[data-testid="signup-button"]').click()

      // Should redirect to dashboard after successful signup
      cy.url().should('include', '/app/dashboard')
      cy.contains('Financial Dashboard').should('be.visible')
      cy.contains(`Welcome, ${testUser.name}`).should('be.visible')

      // Should show welcome notification
      cy.contains('Welcome to LivyFlow!').should('be.visible')
    })

    it('should validate required fields', () => {
      cy.visit('/signup')

      // Try to submit empty form
      cy.get('[data-testid="signup-button"]').click()

      // Should show validation errors
      cy.contains('Name is required').should('be.visible')
      cy.contains('Email is required').should('be.visible')
      cy.contains('Password is required').should('be.visible')
    })

    it('should validate email format', () => {
      cy.visit('/signup')

      cy.get('[data-testid="email-input"]').type('invalid-email')
      cy.get('[data-testid="signup-button"]').click()

      cy.contains('Please enter a valid email address').should('be.visible')
    })

    it('should validate password strength', () => {
      cy.visit('/signup')

      // Test weak password
      cy.get('[data-testid="password-input"]').type('123')
      cy.get('[data-testid="password-strength"]').should('contain', 'Weak')

      // Test strong password
      cy.get('[data-testid="password-input"]').clear().type('StrongPassword123!')
      cy.get('[data-testid="password-strength"]').should('contain', 'Strong')
    })

    it('should handle signup errors gracefully', () => {
      // Mock signup failure
      cy.intercept('POST', '**/auth/register', {
        statusCode: 400,
        body: { error: 'Email already in use' },
      }).as('signupError')

      cy.visit('/signup')

      cy.get('[data-testid="name-input"]').type('Test User')
      cy.get('[data-testid="email-input"]').type('existing@example.com')
      cy.get('[data-testid="password-input"]').type('TestPassword123!')
      cy.get('[data-testid="signup-button"]').click()

      cy.wait('@signupError')
      cy.contains('Email already in use').should('be.visible')
    })
  })

  describe('User Login', () => {
    it('should allow existing user to login successfully', () => {
      cy.visit('/login')
      cy.contains('Sign In to Your Account').should('be.visible')

      // Login with test credentials
      cy.get('[data-testid="email-input"]').type(Cypress.env('testEmail'))
      cy.get('[data-testid="password-input"]').type(Cypress.env('testPassword'))
      cy.get('[data-testid="login-button"]').click()

      // Should redirect to dashboard
      cy.url().should('include', '/app/dashboard')
      cy.contains('Financial Dashboard').should('be.visible')

      // Should display user information
      cy.get('[data-testid="user-menu"]').should('be.visible')
    })

    it('should validate login credentials', () => {
      cy.visit('/login')

      // Try with wrong password
      cy.get('[data-testid="email-input"]').type(Cypress.env('testEmail'))
      cy.get('[data-testid="password-input"]').type('wrongpassword')
      cy.get('[data-testid="login-button"]').click()

      cy.contains('Invalid email or password').should('be.visible')
    })

    it('should validate required fields on login', () => {
      cy.visit('/login')

      cy.get('[data-testid="login-button"]').click()

      cy.contains('Email is required').should('be.visible')
      cy.contains('Password is required').should('be.visible')
    })

    it('should remember user choice to stay logged in', () => {
      cy.visit('/login')

      cy.get('[data-testid="email-input"]').type(Cypress.env('testEmail'))
      cy.get('[data-testid="password-input"]').type(Cypress.env('testPassword'))
      cy.get('[data-testid="remember-me-checkbox"]').check()
      cy.get('[data-testid="login-button"]').click()

      cy.url().should('include', '/app/dashboard')

      // Check that auth token is stored in localStorage
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist')
    })
  })

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Login first
      cy.login()
    })

    it('should logout user and redirect to landing page', () => {
      // Should be on dashboard
      cy.url().should('include', '/app/dashboard')

      // Click user menu and logout
      cy.get('[data-testid="user-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()

      // Should redirect to landing page
      cy.url().should('not.include', '/app/')
      cy.url().should('eq', Cypress.config().baseUrl + '/')

      // Should clear authentication
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('not.exist')
    })

    it('should show logout confirmation if user has unsaved changes', () => {
      // Navigate to budgets and start creating a budget
      cy.navigateToPage('budgets')
      cy.get('[data-testid="create-budget-button"]').click()
      cy.get('[data-testid="budget-name-input"]').type('Unsaved Budget')

      // Try to logout
      cy.get('[data-testid="user-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()

      // Should show confirmation dialog
      cy.contains('You have unsaved changes').should('be.visible')
      cy.get('[data-testid="confirm-logout-button"]').click()

      // Should complete logout
      cy.url().should('not.include', '/app/')
    })
  })

  describe('Protected Route Access', () => {
    it('should redirect unauthenticated users to login', () => {
      // Try to access protected page without authentication
      cy.visit('/app/dashboard')

      // Should redirect to login
      cy.url().should('include', '/login')
      cy.contains('Please sign in to access your dashboard').should('be.visible')
    })

    it('should preserve intended destination after login', () => {
      // Try to access specific protected page
      cy.visit('/app/budgets')

      // Should redirect to login with return URL
      cy.url().should('include', '/login')
      cy.url().should('include', 'returnUrl=%2Fapp%2Fbudgets')

      // Login
      cy.get('[data-testid="email-input"]').type(Cypress.env('testEmail'))
      cy.get('[data-testid="password-input"]').type(Cypress.env('testPassword'))
      cy.get('[data-testid="login-button"]').click()

      // Should redirect to originally requested page
      cy.url().should('include', '/app/budgets')
      cy.contains('Budget Management').should('be.visible')
    })

    it('should handle expired sessions gracefully', () => {
      // Login first
      cy.login()

      // Simulate expired token by clearing it
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'expired-token')
      })

      // Try to access API endpoint
      cy.request({
        url: `${Cypress.env('apiUrl')}/v1/budgets`,
        headers: { Authorization: 'Bearer expired-token' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401)
      })

      // Navigate to a protected page
      cy.visit('/app/budgets', { failOnStatusCode: false })

      // Should redirect to login due to expired session
      cy.url().should('include', '/login')
      cy.contains('Your session has expired').should('be.visible')
    })
  })

  describe('Password Reset Flow', () => {
    it('should allow user to request password reset', () => {
      cy.visit('/login')
      cy.contains('Forgot your password?').click()

      // Should navigate to password reset page
      cy.url().should('include', '/forgot-password')
      cy.contains('Reset Your Password').should('be.visible')

      // Enter email and request reset
      cy.get('[data-testid="email-input"]').type(Cypress.env('testEmail'))
      cy.get('[data-testid="send-reset-button"]').click()

      // Should show success message
      cy.contains('Password reset email sent').should('be.visible')
      cy.contains('Check your email for reset instructions').should('be.visible')
    })

    it('should validate email for password reset', () => {
      cy.visit('/forgot-password')

      cy.get('[data-testid="send-reset-button"]').click()
      cy.contains('Email is required').should('be.visible')

      cy.get('[data-testid="email-input"]').type('invalid-email')
      cy.get('[data-testid="send-reset-button"]').click()
      cy.contains('Please enter a valid email address').should('be.visible')
    })
  })

  describe('Social Authentication', () => {
    it('should support Google authentication', () => {
      cy.visit('/login')

      // Mock Google OAuth response
      cy.window().then((win) => {
        cy.stub(win, 'open').callsFake(() => {
          // Simulate successful Google auth
          win.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            user: {
              uid: 'google-user-123',
              email: 'google@example.com',
              displayName: 'Google User',
            },
            token: 'google-auth-token-123',
          }, '*')
          return { closed: false }
        })
      })

      cy.get('[data-testid="google-login-button"]').click()

      // Should redirect to dashboard after successful Google auth
      cy.url().should('include', '/app/dashboard')
      cy.contains('Welcome, Google User').should('be.visible')
    })

    it('should handle social auth errors', () => {
      cy.visit('/login')

      cy.window().then((win) => {
        cy.stub(win, 'open').callsFake(() => {
          win.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: 'Access denied',
          }, '*')
          return { closed: false }
        })
      })

      cy.get('[data-testid="google-login-button"]').click()

      cy.contains('Authentication failed').should('be.visible')
      cy.contains('Access denied').should('be.visible')
    })
  })

  describe('Account Security', () => {
    beforeEach(() => {
      cy.login()
    })

    it('should allow user to change password', () => {
      cy.navigateToPage('settings')
      cy.contains('Security').click()

      cy.get('[data-testid="current-password-input"]').type(Cypress.env('testPassword'))
      cy.get('[data-testid="new-password-input"]').type('NewPassword123!')
      cy.get('[data-testid="confirm-password-input"]').type('NewPassword123!')
      cy.get('[data-testid="change-password-button"]').click()

      cy.contains('Password changed successfully').should('be.visible')
    })

    it('should validate password change requirements', () => {
      cy.navigateToPage('settings')
      cy.contains('Security').click()

      // Try with wrong current password
      cy.get('[data-testid="current-password-input"]').type('wrongpassword')
      cy.get('[data-testid="new-password-input"]').type('NewPassword123!')
      cy.get('[data-testid="confirm-password-input"]').type('NewPassword123!')
      cy.get('[data-testid="change-password-button"]').click()

      cy.contains('Current password is incorrect').should('be.visible')
    })

    it('should enable two-factor authentication', () => {
      cy.navigateToPage('settings')
      cy.contains('Security').click()

      cy.get('[data-testid="enable-2fa-button"]').click()

      // Should show QR code for 2FA setup
      cy.get('[data-testid="qr-code"]').should('be.visible')
      cy.contains('Scan this QR code with your authenticator app').should('be.visible')

      // Enter verification code
      cy.get('[data-testid="2fa-code-input"]').type('123456')
      cy.get('[data-testid="verify-2fa-button"]').click()

      cy.contains('Two-factor authentication enabled').should('be.visible')
    })
  })

  describe('Session Management', () => {
    it('should handle multiple tab sessions', () => {
      // Login in first tab
      cy.login()
      cy.url().should('include', '/app/dashboard')

      // Open new tab and verify session is maintained
      cy.window().then((win) => {
        const newTab = win.open('/app/budgets', '_blank')
        cy.wrap(newTab).should('exist')
      })

      // Logout in original tab
      cy.logout()

      // Session should be cleared across all tabs
      cy.visit('/app/budgets')
      cy.url().should('include', '/login')
    })

    it('should auto-refresh tokens before expiration', () => {
      cy.login()

      // Mock token refresh endpoint
      cy.intercept('POST', '**/auth/refresh', {
        statusCode: 200,
        body: { token: 'refreshed-token-123' },
      }).as('tokenRefresh')

      // Simulate token near expiration
      cy.window().then((win) => {
        const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.' +
          btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })) + // Expires in 1 minute
          '.signature'
        win.localStorage.setItem('authToken', expiredToken)
      })

      // Navigate to trigger token check
      cy.navigateToPage('budgets')

      // Should automatically refresh token
      cy.wait('@tokenRefresh')

      // Should continue working without user intervention
      cy.contains('Budget Management').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should support keyboard navigation on auth forms', () => {
      cy.visit('/login')

      // Navigate through form with Tab
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-testid', 'email-input')

      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'password-input')

      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'login-button')

      // Should be able to submit with Enter
      cy.get('[data-testid="email-input"]').type(Cypress.env('testEmail'))
      cy.get('[data-testid="password-input"]').type(Cypress.env('testPassword')).type('{enter}')

      cy.url().should('include', '/app/dashboard')
    })

    it('should have proper ARIA labels and roles', () => {
      cy.visit('/login')

      cy.get('[data-testid="login-form"]').should('have.attr', 'role', 'form')
      cy.get('[data-testid="email-input"]').should('have.attr', 'aria-label')
      cy.get('[data-testid="password-input"]').should('have.attr', 'aria-label')
      cy.get('[data-testid="login-button"]').should('have.attr', 'aria-describedby')
    })

    it('should announce form validation errors to screen readers', () => {
      cy.visit('/login')

      cy.get('[data-testid="login-button"]').click()

      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .should('have.attr', 'role', 'alert')
        .should('have.attr', 'aria-live', 'assertive')
    })
  })
})