import '@testing-library/jest-dom'
import crypto from 'crypto'

// Polyfill for crypto.randomUUID in Jest environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => crypto.randomUUID(),
  },
})
