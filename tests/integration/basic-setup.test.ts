import { test, expect, describe } from 'bun:test'

describe('Basic Setup', () => {
  test('Node.js environment should be working', () => {
    expect(typeof process).toBe('object')
    expect(typeof process.env).toBe('object')
  })

  test('can import project modules', async () => {
    // Test basic import without dependencies that might not be available
    expect(() => {
      const { features } = require('../../src/lib/rust-core')
      expect(typeof features).toBe('object')
    }).not.toThrow()
  })

  test('feature flags work correctly', () => {
    // Test without any environment variables set
    process.env.USE_RUST_TOKENIZER = undefined
    process.env.USE_RUST_RATE_LIMIT = undefined
    
    const { features } = require('../../src/lib/rust-core')
    
    expect(features.USE_RUST_TOKENIZER).toBe(false)
    expect(features.USE_RUST_RATE_LIMIT).toBe(false)
    expect(features.USE_RUST_HTTP_CLIENT).toBe(false)
  })

  test('feature flags can be enabled', () => {
    // Test with environment variables set
    process.env.USE_RUST_TOKENIZER = 'true'
    process.env.PERF_MONITOR = 'true'
    
    // Need to reload the module to pick up new env vars
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    const { features } = require('../../src/lib/rust-core')
    
    expect(features.USE_RUST_TOKENIZER).toBe(true)
    expect(features.PERFORMANCE_MONITORING).toBe(true)
    
    // Clean up
    process.env.USE_RUST_TOKENIZER = undefined
    process.env.PERF_MONITOR = undefined
  })
})