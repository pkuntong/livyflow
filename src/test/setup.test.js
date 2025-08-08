import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should have Vitest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have global test utilities available', () => {
    expect(global.mockUser).toBeDefined()
    expect(global.mockBudget).toBeDefined()
    expect(global.mockTransaction).toBeDefined()
    expect(global.mockAccount).toBeDefined()
  })

  it('should have environment variables for testing', () => {
    // Basic test to ensure test environment is set up
    expect(import.meta.env).toBeDefined()
  })
})