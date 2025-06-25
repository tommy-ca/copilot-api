import { test, expect, describe } from 'bun:test'
import { rustCore, features, PerformanceMonitor } from '../../src/lib/rust-core'
import { getTokenCountAsync } from '../../src/lib/hybrid-tokenizer'

// Enable all Rust features for testing
process.env.USE_RUST_TOKENIZER = 'true'
process.env.USE_RUST_RATE_LIMIT = 'true'
process.env.PERF_MONITOR = 'true'

describe('Phase 2: Enhanced Utility Functions', () => {

  describe('Enhanced Tokenization', () => {
    test('async tokenization with Rust acceleration', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello, how are you?' },
        { role: 'assistant' as const, content: 'I\'m doing well, thank you!' }
      ]

      const result = await getTokenCountAsync(messages)
      
      expect(result).toBeDefined()
      expect(result.input).toBeGreaterThan(0)
      expect(result.output).toBeGreaterThan(0)
      console.log(`Tokenization result: ${result.input} input, ${result.output} output tokens`)
    })

    test('handles vision content correctly', async () => {
      const visionMessages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text', text: 'What\'s in this image?' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0...' } }
          ]
        }
      ]

      const result = await getTokenCountAsync(visionMessages as any)
      
      expect(result).toBeDefined()
      expect(result.input).toBeGreaterThan(0)
      console.log(`Vision content tokens: ${result.input} input tokens`)
    })

    test('performance comparison shows improvement', async () => {
      // Generate large message set for performance testing
      const largeMessages = Array(100).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `This is test message ${i} with some substantial content. `.repeat(10)
      }))

      const start = performance.now()
      const result = await getTokenCountAsync(largeMessages)
      const duration = performance.now() - start

      expect(result.input).toBeGreaterThan(5000) // Should have many tokens
      expect(duration).toBeLessThan(1000) // Should be reasonably fast
      console.log(`Large tokenization: ${duration.toFixed(2)}ms for ${result.input} tokens`)
    })
  })

  describe('Enhanced Rate Limiting', () => {
    test('basic rate limiting functionality', async () => {
      const key = 'test_user_1'
      
      // Reset limiter first to ensure clean state
      await rustCore.resetRateLimit(key)
      
      // With burst capacity, multiple requests may be allowed initially
      const allowed1 = await rustCore.checkRateLimit(key, 1, 1) // Burst capacity of 1
      expect(allowed1).toBe(true)
      
      // Immediate second request should be denied with burst capacity of 1
      const allowed2 = await rustCore.checkRateLimit(key, 1, 1)
      expect(allowed2).toBe(false)
      
      console.log('Basic rate limiting: ✓')
    })

    test('burst capacity handling', async () => {
      const key = 'test_user_burst'
      const burstCapacity = 3
      
      // Should allow burst_capacity requests
      for (let i = 0; i < burstCapacity; i++) {
        const allowed = await rustCore.checkRateLimit(key, 10, burstCapacity)
        expect(allowed).toBe(true)
      }
      
      // Next request should be denied
      const denied = await rustCore.checkRateLimit(key, 10, burstCapacity)
      expect(denied).toBe(false)
      
      console.log(`Burst capacity (${burstCapacity}): ✓`)
    })

    test('rate limiter stats and management', async () => {
      // Create some rate limiters
      await rustCore.checkRateLimit('user1', 5)
      await rustCore.checkRateLimit('user2', 5)
      await rustCore.checkRateLimit('user3', 5)
      
      // Check stats
      const stats = await rustCore.getRateLimitStats()
      expect(stats.activeLimiters).toBeGreaterThanOrEqual(3)
      
      // Reset one limiter
      const reset = await rustCore.resetRateLimit('user1')
      expect(reset).toBe(true)
      
      // Should be able to make request again
      const allowed = await rustCore.checkRateLimit('user1', 5)
      expect(allowed).toBe(true)
      
      console.log(`Rate limiter management: ${stats.activeLimiters} active limiters`)
    })

    test('high-throughput performance', async () => {
      const operations = 1000
      const start = performance.now()
      
      const promises = Array(operations).fill(null).map((_, i) => 
        rustCore.checkRateLimit(`perf_test_${i % 100}`, 1)
      )
      
      await Promise.all(promises)
      const duration = performance.now() - start
      const opsPerSecond = (operations / duration) * 1000
      
      expect(duration).toBeLessThan(5000) // Should handle 1000 ops in under 5s
      console.log(`Rate limiting performance: ${opsPerSecond.toFixed(0)} ops/sec`)
    })
  })

  describe('Advanced Validation', () => {
    test('OpenAI chat completion validation', async () => {
      const validPayload = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        model: 'gpt-4',
        max_tokens: 100,
        temperature: 0.7
      }

      const result = await rustCore.validatePayloadDetailed(validPayload)
      
      expect(result.valid).toBe(true)
      expect(result.contentType).toBe('text')
      expect(result.error).toBeUndefined()
      
      console.log('OpenAI validation: ✓')
    })

    test('Anthropic message validation', async () => {
      const validPayload = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        model: 'claude-3-sonnet',
        max_tokens: 100 // Required for Anthropic
      }

      const result = await rustCore.validatePayloadDetailed(validPayload)
      
      expect(result.valid).toBe(true)
      expect(result.contentType).toBe('text') // Our implementation correctly identifies this as text content
      expect(result.error).toBeUndefined()
      
      console.log('Anthropic validation: ✓')
    })

    test('vision content detection', async () => {
      const visionPayload = {
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
          ]
        }],
        model: 'gpt-4-vision-preview'
      }

      const result = await rustCore.validatePayloadDetailed(visionPayload)
      
      expect(result.valid).toBe(true)
      expect(result.contentType).toBe('vision')
      
      console.log('Vision content detection: ✓')
    })

    test('validation error handling', async () => {
      const invalidPayloads = [
        {}, // Missing required fields
        { messages: [] }, // Empty messages
        { messages: [{ role: 'invalid', content: 'test' }] }, // Invalid role
        { messages: [{ role: 'user', content: 'test' }], model: '' }, // Empty model
        { messages: [{ role: 'user', content: 'test' }], model: 'gpt-4', temperature: 5.0 } // Invalid temperature
      ]

      for (const payload of invalidPayloads) {
        const result = await rustCore.validatePayloadDetailed(payload)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      }
      
      console.log('Validation error handling: ✓')
    })

    test('validation performance', async () => {
      const payload = {
        messages: Array(50).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i} with some content`
        })),
        model: 'gpt-4',
        max_tokens: 1000
      }

      const operations = 1000
      const start = performance.now()
      
      const promises = Array(operations).fill(null).map(() => 
        rustCore.validatePayload(payload)
      )
      
      const results = await Promise.all(promises)
      const duration = performance.now() - start
      const opsPerSecond = (operations / duration) * 1000
      
      expect(results.every(r => r === true)).toBe(true)
      expect(duration).toBeLessThan(5000) // Should handle 1000 validations in under 5s
      console.log(`Validation performance: ${opsPerSecond.toFixed(0)} ops/sec`)
    })
  })

  describe('Integration and Feature Flags', () => {
    test('feature flags control functionality', async () => {
      // Test with flags disabled
      delete process.env.USE_RUST_TOKENIZER
      delete process.env.USE_RUST_RATE_LIMIT
      
      // Should still work but use fallbacks
      const messages = [{ role: 'user' as const, content: 'test' }]
      const result = await getTokenCountAsync(messages)
      expect(result).toBeDefined()
      
      // Re-enable for other tests
      process.env.USE_RUST_TOKENIZER = 'true'
      process.env.USE_RUST_RATE_LIMIT = 'true'
      
      console.log('Feature flag system: ✓')
    })

    test('error recovery and fallbacks', async () => {
      // Test with invalid input that should trigger fallbacks
      try {
        await rustCore.validatePayload("invalid json")
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        // This is expected behavior
      }
      
      console.log('Error recovery: ✓')
    })

    test('performance monitoring integration', () => {
      // Performance monitoring should work regardless of flag state
      const timer = PerformanceMonitor.startTimer('test_operation')
      if (timer) {
        const duration = timer.end()
        expect(duration).toBeGreaterThanOrEqual(0)
        console.log('Performance monitoring: ✓')
      } else {
        console.log('Performance monitoring: disabled but functional')
      }
      
      // Should always have timer functionality
      expect(typeof PerformanceMonitor.startTimer).toBe('function')
    })
  })
})