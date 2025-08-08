# Testing Guide for LivyFlow

This document provides comprehensive information about the testing strategy, setup, and best practices for the LivyFlow application.

## Testing Strategy

Our testing approach follows the testing pyramid with comprehensive coverage at all levels:

### 1. Unit Tests (70% of tests)
- **Purpose**: Test individual functions, components, and services in isolation
- **Tools**: Vitest, React Testing Library
- **Location**: `src/**/__tests__/`, `src/**/*.test.js`
- **Coverage**: All service classes, utility functions, and critical business logic

### 2. Integration Tests (20% of tests)
- **Purpose**: Test interaction between multiple components and API endpoints
- **Tools**: Vitest, MSW (Mock Service Worker)
- **Location**: `src/test/integration/`
- **Coverage**: API data flow, service integration, cross-component communication

### 3. End-to-End Tests (10% of tests)
- **Purpose**: Test complete user workflows and critical business processes
- **Tools**: Cypress
- **Location**: `cypress/e2e/`
- **Coverage**: Authentication flow, budget management, bank account connection

## Test Structure

```
src/
├── test/
│   ├── setup.js                 # Test environment setup
│   ├── test-utils.jsx           # Custom render functions and utilities
│   ├── mocks/
│   │   ├── server.js            # MSW server setup
│   │   ├── handlers.js          # API mock handlers
│   │   └── firebase.js          # Firebase mocks
│   └── integration/
│       └── api-integration.test.js
├── services/__tests__/          # Service unit tests
├── contexts/__tests__/          # Context unit tests
├── Pages/__tests__/             # Page component tests
└── components/__tests__/        # Component unit tests

cypress/
├── e2e/                         # End-to-end tests
├── support/                     # Cypress commands and utilities
└── fixtures/                    # Test data
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run tests with UI (Vitest UI)
npm run test:ui

# Run tests and generate coverage report
npm run test:coverage

# Run specific test file
npm run test -- budgetService.test.js

# Run tests matching a pattern
npm run test -- --grep "authentication"
```

### Integration Tests
```bash
# Run integration tests
npm run test -- src/test/integration/

# Run integration tests with coverage
npm run test:coverage -- src/test/integration/
```

### End-to-End Tests
```bash
# Open Cypress Test Runner (interactive mode)
npm run test:e2e

# Run E2E tests in headless mode
npm run test:e2e:headless

# Run specific E2E test
npx cypress run --spec "cypress/e2e/authentication.cy.js"

# Run E2E tests with specific browser
npx cypress run --browser firefox
```

## Test Configuration

### Vitest Configuration (vite.config.js)
```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.js'],
  css: true,
  coverage: {
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/',
      'src/test/',
      '**/*.d.ts',
      '**/*.config.js',
    ],
  },
}
```

### Test Environment Variables
- `VITE_FIREBASE_API_KEY=test-api-key`
- `VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID=test-project`
- `CYPRESS_testEmail=cypress@test.com`
- `CYPRESS_testPassword=TestPassword123!`

## Writing Tests

### Unit Test Example
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth } from '../test/test-utils'
import BudgetCard from '../components/BudgetCard'

describe('BudgetCard', () => {
  const mockBudget = {
    id: 'budget-123',
    name: 'Groceries',
    amount: 500,
    spent: 250,
  }

  it('should display budget information correctly', () => {
    renderWithAuth(<BudgetCard budget={mockBudget} />)
    
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('$500')).toBeInTheDocument()
    expect(screen.getByText('$250')).toBeInTheDocument()
  })
})
```

### Integration Test Example
```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import budgetService from '../../services/budgetService'
import { setMockUser } from '../mocks/firebase'

describe('Budget Service Integration', () => {
  beforeEach(() => {
    setMockUser({
      uid: 'test-user-123',
      getIdToken: () => Promise.resolve('mock-token'),
    })
  })

  it('should create and retrieve budget successfully', async () => {
    const budgetData = {
      name: 'Test Budget',
      amount: 500,
      category: 'Food & Drink',
    }

    const createdBudget = await budgetService.createBudget(budgetData)
    expect(createdBudget.id).toBeDefined()

    const budgets = await budgetService.getBudgets()
    const foundBudget = budgets.find(b => b.id === createdBudget.id)
    expect(foundBudget).toBeTruthy()
  })
})
```

### E2E Test Example
```javascript
describe('Budget Creation Flow', () => {
  beforeEach(() => {
    cy.login()
    cy.navigateToPage('budgets')
  })

  it('should create a new budget', () => {
    cy.get('[data-testid="create-budget-button"]').click()
    cy.get('[data-testid="budget-name-input"]').type('E2E Test Budget')
    cy.get('[data-testid="budget-amount-input"]').type('300')
    cy.get('[data-testid="save-budget-button"]').click()
    
    cy.contains('Budget created successfully').should('be.visible')
    cy.contains('E2E Test Budget').should('be.visible')
  })
})
```

## Mocking Strategy

### Firebase Authentication Mock
```javascript
// src/test/mocks/firebase.js
export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}
```

### API Mocking with MSW
```javascript
// src/test/mocks/handlers.js
export const handlers = [
  http.get('/api/v1/budgets', () => {
    return HttpResponse.json([
      { id: '1', name: 'Groceries', amount: 500 }
    ])
  }),
  
  http.post('/api/v1/budgets', async ({ request }) => {
    const budgetData = await request.json()
    return HttpResponse.json({
      id: 'new-budget-123',
      ...budgetData
    }, { status: 201 })
  }),
]
```

### Cypress Custom Commands
```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login')
  cy.get('[data-testid="email-input"]').type(email || 'test@example.com')
  cy.get('[data-testid="password-input"]').type(password || 'password')
  cy.get('[data-testid="login-button"]').click()
})
```

## Test Data Management

### Factories for Test Data
```javascript
// src/test/factories.js
export const createMockBudget = (overrides = {}) => ({
  id: 'budget-' + Date.now(),
  name: 'Test Budget',
  amount: 500,
  spent: 250,
  category: 'Food & Drink',
  period: 'monthly',
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  getIdToken: vi.fn(() => Promise.resolve('mock-token')),
  ...overrides,
})
```

### Fixtures for E2E Tests
```javascript
// cypress/fixtures/budgets.json
[
  {
    "id": "budget-1",
    "name": "Groceries",
    "amount": 500,
    "category": "Food & Drink"
  }
]
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Statements**: 80%

### Critical Areas (100% Coverage Required)
- Authentication logic (`src/contexts/AuthContext.jsx`)
- Financial calculations (budget spending, transaction processing)
- API service classes (`src/services/`)
- Security-sensitive components

### Coverage Exclusions
- Configuration files (`*.config.js`)
- Test utilities (`src/test/`)
- Third-party integrations (Firebase, Plaid)
- Development-only code

## Continuous Integration

### GitHub Actions Workflows

#### Main Test Workflow (`.github/workflows/test.yml`)
- Runs on push to main/develop branches
- Executes all test types: unit, integration, E2E
- Includes security, performance, and accessibility testing
- Uploads coverage reports to Codecov

#### Pull Request Workflow (`.github/workflows/pr-tests.yml`)
- Runs subset of tests for faster feedback
- Includes visual regression testing
- Provides test results summary in PR comments
- Checks code quality and bundle size impact

### Test Environments
- **Development**: Full test suite with live reload
- **CI/CD**: Automated testing with coverage reporting
- **Production**: Smoke tests and health checks

## Best Practices

### General Testing Principles
1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Arrange-Act-Assert Pattern**: Structure tests clearly with setup, action, and verification
3. **Descriptive Test Names**: Use names that describe the expected behavior
4. **Single Responsibility**: Each test should verify one specific behavior
5. **Independent Tests**: Tests should not depend on each other

### Component Testing Guidelines
```javascript
// ✅ Good - Testing behavior
it('should show error message when form submission fails', async () => {
  renderWithAuth(<LoginForm />)
  
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
  })
})

// ❌ Bad - Testing implementation
it('should call handleSubmit when button is clicked', () => {
  const handleSubmit = vi.fn()
  render(<LoginForm onSubmit={handleSubmit} />)
  
  fireEvent.click(screen.getByRole('button'))
  
  expect(handleSubmit).toHaveBeenCalled()
})
```

### Service Testing Guidelines
```javascript
// ✅ Good - Testing actual API interaction
it('should retry failed requests up to 3 times', async () => {
  server.use(
    http.get('/api/budgets', () => HttpResponse.error(), { once: true }),
    http.get('/api/budgets', () => HttpResponse.error(), { once: true }),
    http.get('/api/budgets', () => HttpResponse.json([]), { once: true })
  )
  
  const budgets = await budgetService.getBudgets()
  expect(budgets).toEqual([])
})
```

### E2E Testing Guidelines
```javascript
// ✅ Good - Complete user workflow
it('should allow user to create budget and see it in dashboard', () => {
  cy.login()
  cy.createBudget({ name: 'Movies', amount: 100 })
  cy.navigateToPage('dashboard')
  cy.contains('Movies').should('be.visible')
})

// ❌ Bad - Testing UI details that may change
it('should have blue background on budget cards', () => {
  cy.get('.budget-card').should('have.class', 'bg-blue-500')
})
```

## Debugging Tests

### Common Issues and Solutions

#### Test Timeouts
```javascript
// Increase timeout for slow operations
await waitFor(() => {
  expect(screen.getByText('Loading...')).not.toBeInTheDocument()
}, { timeout: 5000 })
```

#### Async Testing Issues
```javascript
// Use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// Use act for state updates
await act(async () => {
  fireEvent.click(saveButton)
})
```

#### Mock Not Working
```javascript
// Ensure mocks are cleared between tests
beforeEach(() => {
  vi.clearAllMocks()
})

// Check mock implementation
console.log(mockService.getBudgets.mock.calls)
```

### Debugging Commands
```bash
# Run single test in debug mode
npm run test -- --no-coverage BudgetCard.test.jsx

# Run tests with verbose output
npm run test -- --verbose

# Debug Cypress tests
npx cypress open --env debugMode=true
```

## Performance Testing

### Bundle Size Analysis
```bash
# Analyze bundle size impact
npm run build
npx vite-bundle-analyzer dist --analyze
```

### Component Performance
```javascript
import { act, renderHook } from '@testing-library/react'
import { performance } from 'perf_hooks'

it('should render large budget list efficiently', () => {
  const startTime = performance.now()
  
  render(<BudgetList budgets={largeBudgetArray} />)
  
  const endTime = performance.now()
  const renderTime = endTime - startTime
  
  expect(renderTime).toBeLessThan(100) // Should render in under 100ms
})
```

## Security Testing

### Input Validation Tests
```javascript
it('should sanitize user input to prevent XSS', () => {
  const maliciousInput = '<script>alert("xss")</script>'
  
  render(<BudgetForm />)
  fireEvent.change(screen.getByLabelText('Budget Name'), {
    target: { value: maliciousInput }
  })
  
  expect(screen.getByDisplayValue(maliciousInput)).toBeInTheDocument()
  // Verify script is not executed
  expect(window.alert).not.toHaveBeenCalled()
})
```

### Authentication Tests
```javascript
it('should prevent access to protected routes when not authenticated', () => {
  renderWithoutAuth(<Dashboard />)
  
  expect(screen.getByText('Please sign in')).toBeInTheDocument()
})
```

## Accessibility Testing

### Automated A11y Tests
```javascript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('should be accessible', async () => {
  const { container } = render(<BudgetCard budget={mockBudget} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Manual A11y Tests
```javascript
it('should support keyboard navigation', () => {
  render(<BudgetForm />)
  
  const nameInput = screen.getByLabelText('Budget Name')
  nameInput.focus()
  
  userEvent.tab()
  expect(screen.getByLabelText('Amount')).toHaveFocus()
})
```

## Troubleshooting

### Common Test Failures

#### "Cannot read property of undefined"
- Check if components receive required props
- Ensure mock data matches expected structure
- Verify async operations are properly awaited

#### "Element not found"
- Use `screen.debug()` to see rendered output
- Check if element is rendered asynchronously
- Verify correct test IDs and selectors

#### "Act warnings"
- Wrap state updates in `act()`
- Use `waitFor` for async operations
- Ensure all promises are resolved

### Getting Help

1. **Documentation**: Check this testing guide and tool documentation
2. **Debugging**: Use browser dev tools and test debugging features
3. **Community**: Search Stack Overflow and GitHub issues
4. **Team**: Ask team members for code review and guidance

## Contributing to Tests

### Before Adding Tests
1. Check if similar tests already exist
2. Consider if the test adds value or just increases maintenance
3. Ensure test covers critical user scenarios
4. Follow existing patterns and conventions

### Code Review Checklist
- [ ] Tests cover both happy path and error scenarios
- [ ] Test names clearly describe expected behavior
- [ ] Mocks are realistic and properly cleaned up
- [ ] Tests are deterministic and don't rely on external services
- [ ] Coverage meets minimum thresholds
- [ ] Tests run quickly and don't timeout

### Updating Tests
- Update tests when changing component behavior
- Add tests when fixing bugs to prevent regression
- Refactor tests when code structure changes significantly
- Remove obsolete tests for deleted functionality

---

This testing strategy ensures robust, maintainable code that gives developers confidence to refactor and deploy quickly while maintaining high quality standards.