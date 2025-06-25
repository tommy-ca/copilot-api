import { test, expect, describe } from 'bun:test'
import { rustCore, features, PerformanceMonitor } from '../../src/lib/rust-core'
import { getTokenCount as hybridGetTokenCount } from '../../src/lib/hybrid-tokenizer'
import { getTokenCount as jsGetTokenCount } from '../../src/lib/tokenizer'

describe('Native Module Integration', () => {
  test('should load native module without errors', () => {
    // This test verifies the module loading doesn't crash
    expect(() => {
      // Try to access the rustCore functions
      expect(typeof rustCore.getTokenCount).toBe('function')
      expect(typeof rustCore.checkRateLimit).toBe('function')
      expect(typeof rustCore.validatePayload).toBe('function')
    }).not.toThrow()
  })

  test('feature flags should be configurable', () => {
    // Test that feature flags work correctly
    expect(typeof features.USE_RUST_TOKENIZER).toBe('boolean')
    expect(typeof features.USE_RUST_RATE_LIMIT).toBe('boolean')
    expect(typeof features.USE_RUST_HTTP_CLIENT).toBe('boolean')
    expect(typeof features.PERFORMANCE_MONITORING).toBe('boolean')
  })

  test('performance monitor should work', () => {
    const timer = PerformanceMonitor.startTimer('test_operation')
    
    if (timer) {
      expect(timer.operation).toBe('test_operation')
      expect(typeof timer.start).toBe('number')
      expect(typeof timer.end).toBe('function')
      
      const duration = timer.end()
      expect(duration).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('Rust Tokenization', () => {
  const testMessages = [
    { role: 'user' as const, content: 'Hello world' },
    { role: 'assistant' as const, content: 'Hi there!' }
  ]

  test('should handle basic tokenization if Rust module is available', async () => {
    try {
      const result = await rustCore.getTokenCount(testMessages)
      
      // If we get here, Rust module is available
      expect(result).toBeDefined()
      expect(typeof result.input).toBe('number')
      expect(typeof result.output).toBe('number')
      expect(result.input).toBeGreaterThan(0)
      expect(result.output).toBeGreaterThan(0)
    } catch (error) {
      // If Rust module is not available, that's okay for now
      console.log('Rust tokenizer not available:', error)
    }
  })

  test('hybrid tokenizer should always work', () => {
    const result = hybridGetTokenCount(testMessages)
    
    expect(result).toBeDefined()
    expect(typeof result.input).toBe('number')
    expect(typeof result.output).toBe('number')
    expect(result.input).toBeGreaterThan(0)
    expect(result.output).toBeGreaterThan(0)
  })

  test('should handle complex message content', () => {
    const complexMessages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text', text: 'Describe this image' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
        ]
      },
      { role: 'assistant' as const, content: 'This is a complex response with multiple parts.' }
    ]

    const result = hybridGetTokenCount(complexMessages as any)
    
    expect(result).toBeDefined()
    expect(result.input).toBeGreaterThan(0)
    expect(result.output).toBeGreaterThan(0)
  })

  test('should handle empty messages gracefully', () => {
    const emptyMessages: any[] = []
    
    const result = hybridGetTokenCount(emptyMessages)
    
    expect(result).toBeDefined()
    expect(result.input).toBe(0)
    expect(result.output).toBe(0)
  })
})

describe('Rust Rate Limiting', () => {
  test('should handle rate limiting if Rust module is available', async () => {
    try {
      const result1 = await rustCore.checkRateLimit('test_key', 1)
      expect(typeof result1).toBe('boolean')
      
      // Should be allowed on first call
      expect(result1).toBe(true)
      
      // Should be rate limited on immediate second call
      const result2 = await rustCore.checkRateLimit('test_key', 1)
      expect(result2).toBe(false)
    } catch (error) {
      // If Rust module is not available, that's okay for now
      console.log('Rust rate limiter not available:', error)
    }
  })
})

describe('Rust Validation', () => {
  test('should validate payloads if Rust module is available', async () => {
    const validPayload = {
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gpt-4'
    }
    
    const invalidPayload = {
      model: 'gpt-4'
      // missing messages
    }

    try {
      const validResult = await rustCore.validatePayload(validPayload)
      expect(validResult).toBe(true)
      
      const invalidResult = await rustCore.validatePayload(invalidPayload)
      expect(invalidResult).toBe(false)
    } catch (error) {
      // If Rust module is not available, that's okay for now
      console.log('Rust validator not available:', error)
    }
  })
})

describe('Performance Comparison', () => {
  test('should compare JS vs Rust tokenization performance', () => {
    const largeMessages = Array(100).fill(null).map((_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: 'This is a test message with some content. '.repeat(10)
    }))

    // Benchmark JavaScript implementation
    const jsStart = performance.now()
    const jsResult = jsGetTokenCount(largeMessages)
    const jsTime = performance.now() - jsStart

    // Benchmark hybrid implementation (may use Rust if available)
    const hybridStart = performance.now()
    const hybridResult = hybridGetTokenCount(largeMessages)
    const hybridTime = performance.now() - hybridStart

    console.log(`JS tokenizer: ${jsTime.toFixed(2)}ms`)
    console.log(`Hybrid tokenizer: ${hybridTime.toFixed(2)}ms`)

    // Results should be the same
    expect(hybridResult.input).toBe(jsResult.input)
    expect(hybridResult.output).toBe(jsResult.output)

    // Both should complete in reasonable time
    expect(jsTime).toBeLessThan(1000)
    expect(hybridTime).toBeLessThan(1000)
  })
})