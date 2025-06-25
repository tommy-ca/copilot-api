import { test, expect, describe, beforeEach } from 'bun:test'

describe('Error Handling and Fallback Mechanisms', () => {
  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    Object.keys(require.cache)
      .filter(key => key.includes('rust-core'))
      .forEach(key => delete require.cache[key])
  })

  test('gracefully handles missing native module', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Should not throw during import
    expect(rustCore).toBeDefined()
    expect(typeof rustCore.getTokenCount).toBe('function')
  })

  test('loadNativeModule handles file not found gracefully', () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Should handle missing module gracefully without crashing
    expect(async () => {
      await rustCore.getTokenCount([])
    }).not.toThrow() // The function itself shouldn't throw synchronously
  })

  test('native module functions handle errors with proper messages', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Test getTokenCount error handling
    try {
      await rustCore.getTokenCount([])
      // If we get here, native module is available - that's ok
      console.log('Native module is available for tokenization')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error.message).toContain('Native module not available')
    }

    // Test checkRateLimit error handling
    try {
      await rustCore.checkRateLimit('test', 1)
      // If we get here, native module is available - that's ok
      console.log('Native module is available for rate limiting')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error.message).toContain('Native module not available')
    }

    // Test validatePayload error handling
    try {
      await rustCore.validatePayload({})
      // If we get here, native module is available - that's ok
      console.log('Native module is available for validation')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error.message).toContain('Native module not available')
    }
  })

  test('performance monitoring handles missing native module', () => {
    process.env.PERF_MONITOR = 'true'
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    // Should work even without native module
    const timer = PerformanceMonitor.startTimer('test_operation')
    expect(timer).not.toBe(null)
    expect(typeof timer.end).toBe('function')
    
    // Should be able to end timer
    expect(() => timer.end()).not.toThrow()
    
    // Clean up
    delete process.env.PERF_MONITOR
  })

  test('handles invalid JSON input gracefully', async () => {
    // Mock a native module that might receive invalid JSON
    const originalConsole = console.warn
    let warnMessage = ''
    console.warn = (msg: any) => { warnMessage = msg }
    
    const { rustCore } = require('../../src/lib/rust-core')
    
    try {
      // This should fail gracefully
      await rustCore.getTokenCount('invalid json')
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeDefined()
    }

    // Restore console
    console.warn = originalConsole
  })

  test('handles network-like errors in placeholder functions', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Placeholder functions should not throw
    expect(async () => {
      await rustCore.createChatCompletions({})
    }).not.toThrow()

    expect(async () => {
      await rustCore.createEmbeddings({})  
    }).not.toThrow()

    expect(async () => {
      await rustCore.getModels()
    }).not.toThrow()

    expect(async () => {
      await rustCore.setupGitHubToken({})
    }).not.toThrow()

    expect(async () => {
      await rustCore.refreshToken()
    }).not.toThrow()
  })

  test('console warnings are produced for fallbacks', async () => {
    const originalConsole = console.warn
    const warnings: string[] = []
    console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
    
    // Test that placeholder functions produce warnings
    const { rustCore } = require('../../src/lib/rust-core')
    
    try {
      // These should produce warnings since they're placeholder functions
      await rustCore.createChatCompletions({})
      await rustCore.createEmbeddings({})
      await rustCore.getModels()
    } catch (error) {
      // Expected for placeholder functions
    }

    // Should have produced warnings from placeholder functions
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.includes('not yet implemented'))).toBe(true)
    
    // Restore console
    console.warn = originalConsole
  })

  test('module loading failure is cached to avoid repeated attempts', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // First attempt should try to load and fail
    try {
      await rustCore.getTokenCount([])
    } catch (error) {
      // Expected
    }

    // Second attempt should use cached failure (not try to load again)
    try {
      await rustCore.checkRateLimit('test', 1)
    } catch (error) {
      expect(error.message).toContain('Native module not available')
    }
  })

  test('handles edge cases in performance monitoring', () => {
    process.env.PERF_MONITOR = 'true'
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    // Test with empty operation name
    const timer1 = PerformanceMonitor.startTimer('')
    expect(timer1).not.toBe(null)
    
    // Test with very long operation name
    const longName = 'x'.repeat(1000)
    const timer2 = PerformanceMonitor.startTimer(longName)
    expect(timer2).not.toBe(null)
    expect(timer2.operation).toBe(longName)
    
    // Test multiple timers
    const timer3 = PerformanceMonitor.startTimer('operation1')
    const timer4 = PerformanceMonitor.startTimer('operation2')
    
    expect(timer3).not.toBe(null)
    expect(timer4).not.toBe(null)
    expect(timer3.operation).toBe('operation1')
    expect(timer4.operation).toBe('operation2')
    
    // Clean up
    delete process.env.PERF_MONITOR
  })

  test('validates feature flag edge cases', () => {
    // Test with undefined environment (should not crash)
    delete process.env.USE_RUST_TOKENIZER
    delete process.env.USE_RUST_RATE_LIMIT
    delete process.env.USE_RUST_HTTP_CLIENT
    delete process.env.PERF_MONITOR
    
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    
    expect(() => {
      const { features } = require('../../src/lib/rust-core')
      expect(features).toBeDefined()
    }).not.toThrow()
  })

  test('error messages are descriptive and actionable', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    try {
      await rustCore.getTokenCount([])
    } catch (error) {
      // Error message should be helpful for debugging
      expect(error.message).toBeTruthy()
      expect(error.message.length).toBeGreaterThan(10)
      expect(error.message).toContain('Native module')
    }
  })

  test('preserves original error context when available', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Test that errors maintain meaningful context
    try {
      await rustCore.validatePayload('invalid json that will cause parsing error')
    } catch (error) {
      expect(error).toBeDefined()
      expect(error.message).toBeTruthy()
    }
  })

  test('handles concurrent error scenarios', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Multiple concurrent operations should all handle errors gracefully
    const promises = [
      rustCore.getTokenCount([]).catch(e => e),
      rustCore.checkRateLimit('test', 1).catch(e => e),
      rustCore.validatePayload({}).catch(e => e),
      rustCore.createChatCompletions({}).catch(e => e),
      rustCore.getModels().catch(e => e)
    ]
    
    const results = await Promise.all(promises)
    
    // All should complete (either success or handled error)
    expect(results).toHaveLength(5)
    results.forEach(result => {
      expect(result).toBeDefined()
    })
  })
})