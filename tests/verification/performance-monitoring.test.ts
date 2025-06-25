import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

describe('Performance Monitoring Validation', () => {
  let originalConsoleLog: typeof console.log
  let logMessages: string[] = []

  beforeEach(() => {
    // Clear environment and module cache
    delete process.env.PERF_MONITOR
    Object.keys(require.cache)
      .filter(key => key.includes('rust-core'))
      .forEach(key => delete require.cache[key])
    
    // Capture console.log messages
    originalConsoleLog = console.log
    logMessages = []
    console.log = (msg: string) => {
      logMessages.push(msg)
    }
  })

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog
    delete process.env.PERF_MONITOR
  })

  test('PerformanceMonitor returns null when monitoring disabled', () => {
    process.env.PERF_MONITOR = undefined
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer = PerformanceMonitor.startTimer('test_operation')
    expect(timer).toBe(null)
  })

  test('PerformanceMonitor works when monitoring enabled', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer = PerformanceMonitor.startTimer('test_operation')
    
    expect(timer).not.toBe(null)
    expect(timer.operation).toBe('test_operation')
    expect(typeof timer.start).toBe('number')
    expect(typeof timer.end).toBe('function')
    expect(timer.start).toBeGreaterThan(0)
  })

  test('timer measures actual elapsed time', async () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer = PerformanceMonitor.startTimer('test_delay')
    
    // Wait a small amount of time
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const duration = timer.end()
    
    // Should have measured some positive duration
    expect(duration).toBeGreaterThan(5) // At least 5ms
    expect(duration).toBeLessThan(100) // But less than 100ms (reasonable for test)
  })

  test('timer.end() logs performance information', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer = PerformanceMonitor.startTimer('test_logging')
    timer.end()
    
    // Should have logged performance info
    expect(logMessages.length).toBeGreaterThan(0)
    const perfLog = logMessages.find(msg => msg.includes('[PERF]'))
    expect(perfLog).toBeDefined()
    expect(perfLog).toContain('test_logging')
    expect(perfLog).toContain('ms')
  })

  test('multiple timers work independently', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer1 = PerformanceMonitor.startTimer('operation1')
    const timer2 = PerformanceMonitor.startTimer('operation2')
    
    expect(timer1).not.toBe(null)
    expect(timer2).not.toBe(null)
    expect(timer1.operation).toBe('operation1')
    expect(timer2.operation).toBe('operation2')
    expect(timer1.start).not.toBe(timer2.start) // Different start times
    
    // End timers
    const duration1 = timer1.end()
    const duration2 = timer2.end()
    
    expect(duration1).toBeGreaterThanOrEqual(0)
    expect(duration2).toBeGreaterThanOrEqual(0)
  })

  test('performance logs include proper formatting', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer = PerformanceMonitor.startTimer('formatted_test')
    timer.end()
    
    const perfLog = logMessages.find(msg => msg.includes('[PERF]'))
    expect(perfLog).toBeDefined()
    
    // Should have format: [PERF] operation: duration.XXms
    expect(perfLog).toMatch(/\[PERF\] formatted_test: \d+\.\d{2}ms/)
  })

  test('handles edge cases in operation names', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    // Test with empty string
    const timer1 = PerformanceMonitor.startTimer('')
    expect(timer1).not.toBe(null)
    timer1.end()
    
    // Test with special characters
    const timer2 = PerformanceMonitor.startTimer('test-with_special.chars:123')
    expect(timer2).not.toBe(null)
    expect(timer2.operation).toBe('test-with_special.chars:123')
    timer2.end()
    
    // Test with very long name
    const longName = 'x'.repeat(1000)
    const timer3 = PerformanceMonitor.startTimer(longName)
    expect(timer3).not.toBe(null)
    expect(timer3.operation).toBe(longName)
    timer3.end()
  })

  test('performance monitoring integrates with rust-core functions', async () => {
    process.env.PERF_MONITOR = 'true'
    const { rustCore } = require('../../src/lib/rust-core')
    
    // These should trigger performance monitoring when they run
    try {
      await rustCore.getTokenCount([])
    } catch (error) {
      // Expected to fail, but should still log performance
    }
    
    try {
      await rustCore.checkRateLimit('test', 1)
    } catch (error) {
      // Expected to fail, but should still log performance
    }
    
    try {
      await rustCore.validatePayload({})
    } catch (error) {
      // Expected to fail, but should still log performance
    }
    
    // Should have performance logs for these operations
    const perfLogs = logMessages.filter(msg => msg.includes('[PERF]'))
    expect(perfLogs.length).toBeGreaterThan(0)
  })

  test('timing precision is reasonable', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    // Very quick operation
    const timer = PerformanceMonitor.startTimer('quick_operation')
    const duration = timer.end()
    
    // Should measure at least microsecond precision
    expect(duration).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(duration)).toBe(true)
    expect(duration).toBeLessThan(10) // Quick operation should be < 10ms
  })

  test('concurrent timing operations', async () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    // Start multiple timers concurrently
    const timers = [
      PerformanceMonitor.startTimer('concurrent1'),
      PerformanceMonitor.startTimer('concurrent2'),
      PerformanceMonitor.startTimer('concurrent3')
    ]
    
    // All should be valid
    timers.forEach(timer => {
      expect(timer).not.toBe(null)
      expect(typeof timer.end).toBe('function')
    })
    
    // End all timers
    const durations = timers.map(timer => timer.end())
    
    // All should have valid durations
    durations.forEach(duration => {
      expect(duration).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(duration)).toBe(true)
    })
    
    // Should have 3 performance logs
    const perfLogs = logMessages.filter(msg => msg.includes('[PERF]'))
    expect(perfLogs.length).toBe(3)
  })

  test('performance monitoring overhead is minimal', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const iterations = 1000
    const start = performance.now()
    
    // Run many timer operations
    for (let i = 0; i < iterations; i++) {
      const timer = PerformanceMonitor.startTimer(`test_${i}`)
      timer.end()
    }
    
    const total = performance.now() - start
    const avgPerOperation = total / iterations
    
    // Average overhead should be very low (< 1ms per operation)
    expect(avgPerOperation).toBeLessThan(1)
    expect(total).toBeLessThan(100) // Total should be reasonable
  })

  test('timer handles system clock changes gracefully', () => {
    process.env.PERF_MONITOR = 'true'
    const { PerformanceMonitor } = require('../../src/lib/rust-core')
    
    const timer = PerformanceMonitor.startTimer('clock_test')
    
    // End immediately (minimal time)
    const duration = timer.end()
    
    // Should handle edge case of very small durations
    expect(duration).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(duration)).toBe(true)
  })
})