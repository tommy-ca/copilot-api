import { test, expect, describe } from 'bun:test'
import { getTokenCount as jsGetTokenCount } from '../../src/lib/tokenizer'
import { getTokenCountAsync } from '../../src/lib/hybrid-tokenizer'
import { features } from '../../src/lib/rust-core'

describe('Tokenization Performance Benchmarks', () => {
  const testMessages = [
    { role: 'user' as const, content: 'Hello world, this is a test message.' },
    { role: 'assistant' as const, content: 'Hi there! This is a response.' },
    { role: 'user' as const, content: 'Can you help me with a coding problem?' },
    { role: 'assistant' as const, content: 'Of course! I\'d be happy to help you with your coding question.' }
  ]

  const largeMessages = Array(50).fill(null).map((_, i) => ({
    role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: 'This is a longer test message with more content to tokenize. '.repeat(20)
  }))

  test('JavaScript tokenization baseline', () => {
    const start = performance.now()
    const result = jsGetTokenCount(testMessages)
    const duration = performance.now() - start
    
    console.log(`JS Tokenization (small): ${duration.toFixed(3)}ms, tokens: ${result.input}/${result.output}`)
    
    expect(result).toBeDefined()
    expect(result.input).toBeGreaterThan(0)
    expect(result.output).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000) // Should be fast
  })

  test('Rust tokenization with feature flag', async () => {
    // Enable Rust tokenizer for this test
    const originalFlag = process.env.USE_RUST_TOKENIZER
    process.env.USE_RUST_TOKENIZER = 'true'
    
    try {
      const start = performance.now()
      const result = await getTokenCountAsync(testMessages)
      const duration = performance.now() - start
      
      console.log(`Rust Tokenization (small): ${duration.toFixed(3)}ms, tokens: ${result.input}/${result.output}`)
      
      expect(result).toBeDefined()
      expect(result.input).toBeGreaterThan(0)
      expect(result.output).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    } finally {
      // Restore original flag
      if (originalFlag) {
        process.env.USE_RUST_TOKENIZER = originalFlag
      } else {
        delete process.env.USE_RUST_TOKENIZER
      }
    }
  })

  test('Large message performance comparison', async () => {
    // JavaScript benchmark
    const jsStart = performance.now()
    const jsResult = jsGetTokenCount(largeMessages)
    const jsDuration = performance.now() - jsStart
    
    // Rust benchmark with feature flag
    const originalFlag = process.env.USE_RUST_TOKENIZER
    process.env.USE_RUST_TOKENIZER = 'true'
    
    try {
      const rustStart = performance.now()
      const rustResult = await getTokenCountAsync(largeMessages)
      const rustDuration = performance.now() - rustStart
      
      console.log(`Large Messages Performance:`)
      console.log(`  JS: ${jsDuration.toFixed(3)}ms, tokens: ${jsResult.input}/${jsResult.output}`)
      console.log(`  Rust: ${rustDuration.toFixed(3)}ms, tokens: ${rustResult.input}/${rustResult.output}`)
      console.log(`  Speedup: ${(jsDuration / rustDuration).toFixed(2)}x`)
      
      // Both should produce reasonable results
      expect(jsResult.input).toBeGreaterThan(1000) // Large messages should have many tokens
      expect(rustResult.input).toBeGreaterThan(1000)
      
      // Performance should be reasonable
      expect(jsDuration).toBeLessThan(5000) // 5 second max for JS
      expect(rustDuration).toBeLessThan(5000) // 5 second max for Rust
      
    } finally {
      // Restore original flag
      if (originalFlag) {
        process.env.USE_RUST_TOKENIZER = originalFlag
      } else {
        delete process.env.USE_RUST_TOKENIZER
      }
    }
  })

  test('Edge cases: empty and complex messages', async () => {
    const edgeCases = [
      [],
      [{ role: 'user' as const, content: '' }],
      [{ role: 'user' as const, content: [
        { type: 'text', text: 'Describe this image' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
      ] }]
    ]

    const originalFlag = process.env.USE_RUST_TOKENIZER
    process.env.USE_RUST_TOKENIZER = 'true'
    
    try {
      for (const messages of edgeCases) {
        const jsResult = jsGetTokenCount(messages as any)
        const rustResult = await getTokenCountAsync(messages as any)
        
        console.log(`Edge case tokens - JS: ${jsResult.input}/${jsResult.output}, Rust: ${rustResult.input}/${rustResult.output}`)
        
        // Results should be reasonable (may not be identical due to tokenizer differences)
        expect(jsResult.input).toBeGreaterThanOrEqual(0)
        expect(rustResult.input).toBeGreaterThanOrEqual(0)
        expect(jsResult.output).toBeGreaterThanOrEqual(0)
        expect(rustResult.output).toBeGreaterThanOrEqual(0)
      }
    } finally {
      // Restore original flag
      if (originalFlag) {
        process.env.USE_RUST_TOKENIZER = originalFlag
      } else {
        delete process.env.USE_RUST_TOKENIZER
      }
    }
  })

  test('Feature flag system works correctly', async () => {
    // Test with flag disabled
    const originalFlag = process.env.USE_RUST_TOKENIZER
    delete process.env.USE_RUST_TOKENIZER
    
    const result1 = await getTokenCountAsync(testMessages)
    expect(result1).toBeDefined()
    
    // Test with flag enabled
    process.env.USE_RUST_TOKENIZER = 'true'
    
    const result2 = await getTokenCountAsync(testMessages)
    expect(result2).toBeDefined()
    
    // Both should work
    expect(result1.input).toBeGreaterThan(0)
    expect(result2.input).toBeGreaterThan(0)
    
    // Restore original flag
    if (originalFlag) {
      process.env.USE_RUST_TOKENIZER = originalFlag
    } else {
      delete process.env.USE_RUST_TOKENIZER
    }
  })
})