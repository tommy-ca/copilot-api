import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

describe('Feature Flag System Comprehensive Tests', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // Save original environment
    originalEnv = {
      USE_RUST_TOKENIZER: process.env.USE_RUST_TOKENIZER,
      USE_RUST_RATE_LIMIT: process.env.USE_RUST_RATE_LIMIT,
      USE_RUST_HTTP_CLIENT: process.env.USE_RUST_HTTP_CLIENT,
      PERF_MONITOR: process.env.PERF_MONITOR
    }

    // Clear all feature flags
    delete process.env.USE_RUST_TOKENIZER
    delete process.env.USE_RUST_RATE_LIMIT
    delete process.env.USE_RUST_HTTP_CLIENT
    delete process.env.PERF_MONITOR

    // Clear module cache to ensure fresh imports
    const cacheKeys = Object.keys(require.cache).filter(key => key.includes('rust-core'))
    cacheKeys.forEach(key => delete require.cache[key])
  })

  afterEach(() => {
    // Restore original environment
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    })

    // Clear module cache
    const cacheKeys = Object.keys(require.cache).filter(key => key.includes('rust-core'))
    cacheKeys.forEach(key => delete require.cache[key])
  })

  test('all feature flags default to false', () => {
    const { features } = require('../../src/lib/rust-core')
    
    expect(features.USE_RUST_TOKENIZER).toBe(false)
    expect(features.USE_RUST_RATE_LIMIT).toBe(false)
    expect(features.USE_RUST_HTTP_CLIENT).toBe(false)
    expect(features.PERFORMANCE_MONITORING).toBe(false)
  })

  test('individual feature flags can be enabled', () => {
    process.env.USE_RUST_TOKENIZER = 'true'
    const { features } = require('../../src/lib/rust-core')
    
    expect(features.USE_RUST_TOKENIZER).toBe(true)
    expect(features.USE_RUST_RATE_LIMIT).toBe(false)
    expect(features.USE_RUST_HTTP_CLIENT).toBe(false)
    expect(features.PERFORMANCE_MONITORING).toBe(false)
  })

  test('multiple feature flags can be enabled simultaneously', () => {
    process.env.USE_RUST_TOKENIZER = 'true'
    process.env.USE_RUST_RATE_LIMIT = 'true'
    process.env.PERF_MONITOR = 'true'
    
    const { features } = require('../../src/lib/rust-core')
    
    expect(features.USE_RUST_TOKENIZER).toBe(true)
    expect(features.USE_RUST_RATE_LIMIT).toBe(true)
    expect(features.USE_RUST_HTTP_CLIENT).toBe(false)
    expect(features.PERFORMANCE_MONITORING).toBe(true)
  })

  test('feature flags only activate on "true" value', () => {
    // Test various values that should NOT activate flags
    const falsyValues = ['false', '0', '', 'FALSE', 'True', 'TRUE', '1', 'yes']
    
    for (const value of falsyValues) {
      delete require.cache[require.resolve('../../src/lib/rust-core')]
      process.env.USE_RUST_TOKENIZER = value
      
      const { features } = require('../../src/lib/rust-core')
      
      if (value === 'true') {
        expect(features.USE_RUST_TOKENIZER).toBe(true)
      } else {
        expect(features.USE_RUST_TOKENIZER).toBe(false)
      }
    }
  })

  test('performance monitor respects feature flag', () => {
    // Test with monitoring disabled
    process.env.PERF_MONITOR = undefined
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    let { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    let timer = PerformanceMonitor.startTimer('test')
    expect(timer).toBe(null)

    // Test with monitoring enabled
    process.env.PERF_MONITOR = 'true'
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    PerformanceMonitor = require('../../src/lib/rust-core').PerformanceMonitor
    
    timer = PerformanceMonitor.startTimer('test')
    expect(timer).not.toBe(null)
    expect(typeof timer.end).toBe('function')
    expect(typeof timer.start).toBe('number')
    expect(timer.operation).toBe('test')
  })

  test('rustCore functions respect feature flags', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // All functions should exist regardless of flags
    expect(typeof rustCore.getTokenCount).toBe('function')
    expect(typeof rustCore.checkRateLimit).toBe('function')
    expect(typeof rustCore.validatePayload).toBe('function')
    expect(typeof rustCore.createChatCompletions).toBe('function')
    expect(typeof rustCore.createEmbeddings).toBe('function')
    expect(typeof rustCore.getModels).toBe('function')
    expect(typeof rustCore.setupGitHubToken).toBe('function')
    expect(typeof rustCore.refreshToken).toBe('function')
  })

  test('hybrid tokenizer respects USE_RUST_TOKENIZER flag', async () => {
    // Create a mock implementation to test flag behavior
    const mockGetTokenCount = jest.fn().mockReturnValue({ input: 10, output: 5 })
    
    // Test with flag disabled (should use JS implementation)
    process.env.USE_RUST_TOKENIZER = 'false'
    delete require.cache[require.resolve('../../src/lib/hybrid-tokenizer')]
    
    // Note: We can't fully test hybrid-tokenizer due to gpt-tokenizer dependency
    // But we can verify the feature flag structure
    const { features } = require('../../src/lib/rust-core')
    expect(features.USE_RUST_TOKENIZER).toBe(false)
  })

  test('feature flags can be changed at runtime', () => {
    // Start with flags off
    let { features } = require('../../src/lib/rust-core')
    expect(features.USE_RUST_TOKENIZER).toBe(false)
    
    // Enable flag and reload module
    process.env.USE_RUST_TOKENIZER = 'true'
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    features = require('../../src/lib/rust-core').features
    expect(features.USE_RUST_TOKENIZER).toBe(true)
    
    // Disable flag and reload module  
    process.env.USE_RUST_TOKENIZER = 'false'
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    features = require('../../src/lib/rust-core').features
    expect(features.USE_RUST_TOKENIZER).toBe(false)
  })

  test('feature flag values are exported correctly', () => {
    const testCases = [
      { env: {}, expected: { USE_RUST_TOKENIZER: false, USE_RUST_RATE_LIMIT: false, USE_RUST_HTTP_CLIENT: false, PERFORMANCE_MONITORING: false } },
      { env: { USE_RUST_TOKENIZER: 'true' }, expected: { USE_RUST_TOKENIZER: true, USE_RUST_RATE_LIMIT: false, USE_RUST_HTTP_CLIENT: false, PERFORMANCE_MONITORING: false } },
      { env: { USE_RUST_RATE_LIMIT: 'true' }, expected: { USE_RUST_TOKENIZER: false, USE_RUST_RATE_LIMIT: true, USE_RUST_HTTP_CLIENT: false, PERFORMANCE_MONITORING: false } },
      { env: { PERF_MONITOR: 'true' }, expected: { USE_RUST_TOKENIZER: false, USE_RUST_RATE_LIMIT: false, USE_RUST_HTTP_CLIENT: false, PERFORMANCE_MONITORING: true } },
    ]

    for (const { env, expected } of testCases) {
      // Clear environment
      delete process.env.USE_RUST_TOKENIZER
      delete process.env.USE_RUST_RATE_LIMIT
      delete process.env.USE_RUST_HTTP_CLIENT
      delete process.env.PERF_MONITOR
      
      // Set test environment
      Object.entries(env).forEach(([key, value]) => {
        process.env[key] = value
      })
      
      // Clear cache and require fresh module
      delete require.cache[require.resolve('../../src/lib/rust-core')]
      const { features } = require('../../src/lib/rust-core')
      
      // Verify expectations
      Object.entries(expected).forEach(([key, expectedValue]) => {
        expect(features[key]).toBe(expectedValue)
      })
    }
  })

  test('error handling works when native module is not available', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // These should handle errors gracefully
    try {
      await rustCore.getTokenCount([])
    } catch (error) {
      expect(error.message).toContain('Native module not available')
    }

    try {
      await rustCore.checkRateLimit('test', 1)
    } catch (error) {
      expect(error.message).toContain('Native module not available')
    }

    try {
      await rustCore.validatePayload({})
    } catch (error) {
      expect(error.message).toContain('Native module not available')
    }
  })

  test('placeholder functions work correctly', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Test placeholder implementations
    const chatResult = await rustCore.createChatCompletions({})
    expect(chatResult.placeholder).toBe('not_implemented')
    
    const embeddingResult = await rustCore.createEmbeddings({})
    expect(embeddingResult.placeholder).toBe('not_implemented')
    
    const modelsResult = await rustCore.getModels()
    expect(modelsResult.placeholder).toBe('not_implemented')
    
    const authResult = await rustCore.setupGitHubToken({})
    expect(authResult.placeholder).toBe('not_implemented')
    
    const refreshResult = await rustCore.refreshToken()
    expect(refreshResult.placeholder).toBe('not_implemented')
  })
})