// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Hide fetch/XHR requests from command log for cleaner output
// Cypress.on('window:before:load', (win) => {
//   cy.stub(win.console, 'warn').callsFake((message) => {
//     // Suppress specific warnings if needed
//     if (!message.includes('Warning message to suppress')) {
//       console.warn(message)
//     }
//   })
// })

// Global before hook for all tests
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.clearAllLocalStorage()
  cy.clearAllSessionStorage()
  cy.clearAllCookies()
  
  // Set up viewport
  cy.viewport(1280, 720)
})

// Global after hook for cleanup
afterEach(() => {
  // Additional cleanup if needed
  cy.task('log', 'Test completed: ' + Cypress.currentTest.title)
})