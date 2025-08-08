import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup requests mocking server with given request handlers
export const server = setupServer(...handlers)