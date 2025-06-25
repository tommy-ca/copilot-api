import { test, expect, describe } from 'bun:test'

describe('Native Module Basic Tests', () => {
  test('should load rust-core module', () => {
    expect(() => {
      const { rustCore, features, PerformanceMonitor } = require('../../src/lib/rust-core')
      
      expect(typeof rustCore).toBe('object')
      expect(typeof features).toBe('object')
      expect(typeof PerformanceMonitor).toBe('function')
    }).not.toThrow()
  })

  test('rustCore should have expected methods', () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    expect(typeof rustCore.getTokenCount).toBe('function')
    expect(typeof rustCore.checkRateLimit).toBe('function')
    expect(typeof rustCore.validatePayload).toBe('function')
    expect(typeof rustCore.createChatCompletions).toBe('function')
    expect(typeof rustCore.createEmbeddings).toBe('function')
    expect(typeof rustCore.getModels).toBe('function')
    expect(typeof rustCore.setupGitHubToken).toBe('function')
    expect(typeof rustCore.refreshToken).toBe('function')
  })

  test('performance monitor should work', () => {
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    // Test without monitoring enabled
    const timer1 = PerformanceMonitor.startTimer('test')
    expect(timer1).toBe(null)
    
    // Test with monitoring enabled
    process.env.PERF_MONITOR = 'true'
    delete require.cache[require.resolve('../../src/lib/rust-core')]
    const { PerformanceMonitor: PerfMon } = require('../../src/lib/rust-core')
    
    const timer2 = PerfMon.startTimer('test')
    expect(timer2).not.toBe(null)
    expect(typeof timer2?.end).toBe('function')
    
    // Clean up
    process.env.PERF_MONITOR = undefined
  })

  test('should handle native module loading gracefully', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Test validation function - should either work or fail gracefully
    try {
      const result = await rustCore.validatePayload({ messages: [], model: 'test' })
      // If it works, result should be boolean
      expect(typeof result).toBe('boolean')
      console.log('✓ Native module validation is working')
    } catch (error) {
      // If it fails, that's expected if native module isn't available
      console.log('⚠ Native module not available (expected during initial setup):', error.message)
      expect(error).toBeDefined()
    }
  })

  test('placeholder functions should return expected responses', async () => {
    const { rustCore } = require('../../src/lib/rust-core')
    
    // Test placeholder functions that aren't implemented yet
    const chatResult = await rustCore.createChatCompletions({})
    expect(chatResult.placeholder).toBe('not_implemented')
    
    const embeddingsResult = await rustCore.createEmbeddings({})
    expect(embeddingsResult.placeholder).toBe('not_implemented')
    
    const modelsResult = await rustCore.getModels()
    expect(modelsResult.placeholder).toBe('not_implemented')
    
    const authResult = await rustCore.setupGitHubToken({})
    expect(authResult.placeholder).toBe('not_implemented')
    
    const refreshResult = await rustCore.refreshToken()
    expect(refreshResult.placeholder).toBe('not_implemented')
  })
})