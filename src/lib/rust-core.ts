// Node.js integration layer for Rust native module
import type { Message } from "~/services/copilot/create-chat-completions"

// Feature flags for gradual rollout
export const features = {
  USE_RUST_TOKENIZER: process.env.USE_RUST_TOKENIZER === 'true',
  USE_RUST_RATE_LIMIT: process.env.USE_RUST_RATE_LIMIT === 'true',
  USE_RUST_HTTP_CLIENT: process.env.USE_RUST_HTTP_CLIENT === 'true',
  PERFORMANCE_MONITORING: process.env.PERF_MONITOR === 'true'
}

// Performance monitoring helper
export class PerformanceMonitor {
  static startTimer(operation: string) {
    if (!features.PERFORMANCE_MONITORING) return null
    
    return {
      operation,
      start: performance.now(),
      end() {
        const duration = performance.now() - this.start
        console.log(`[PERF] ${operation}: ${duration.toFixed(2)}ms`)
        return duration
      }
    }
  }
}

// Lazy load the native module to handle cases where it's not available
let nativeModule: any = null

function loadNativeModule() {
  if (nativeModule === null) {
    try {
      // Load the native module (try different possible paths)
      try {
        nativeModule = require('../../native/index.node')
      } catch {
        try {
          nativeModule = require('../../native/target/release/copilot_api_native.node')
        } catch {
          nativeModule = require('../../native/target/release/libcopilot_api_native.so')
        }
      }
    } catch (error) {
      console.warn('Failed to load Rust native module:', error)
      nativeModule = false // Mark as failed to avoid retrying
    }
  }
  return nativeModule || null
}

// Rust core interface
export const rustCore = {
  async getTokenCount(messages: Array<Message>) {
    const timer = PerformanceMonitor.startTimer('rust_tokenizer')
    
    try {
      const native = loadNativeModule()
      if (!native) throw new Error('Native module not available')
      
      const result = native.getTokenCount(JSON.stringify(messages))
      timer?.end()
      return result
    } catch (error) {
      timer?.end()
      console.warn('Rust tokenizer failed, falling back to JS:', error)
      throw error
    }
  },

  async checkRateLimit(key: string, intervalSecs: number): Promise<boolean> {
    const timer = PerformanceMonitor.startTimer('rust_rate_limit')
    
    try {
      const native = loadNativeModule()
      if (!native) throw new Error('Native module not available')
      
      const result = native.checkRateLimit(key, intervalSecs)
      timer?.end()
      return result
    } catch (error) {
      timer?.end()
      console.warn('Rust rate limiter failed, falling back to JS:', error)
      throw error
    }
  },

  async validatePayload(payload: any): Promise<boolean> {
    const timer = PerformanceMonitor.startTimer('rust_validation')
    
    try {
      const native = loadNativeModule()
      if (!native) throw new Error('Native module not available')
      
      const result = native.validatePayload(JSON.stringify(payload))
      timer?.end()
      return result
    } catch (error) {
      timer?.end()
      console.warn('Rust validation failed, falling back to JS:', error)
      throw error
    }
  },

  // Placeholder functions for Phase 3 implementation
  async createChatCompletions(payload: any) {
    console.warn('createChatCompletions not yet implemented in Rust')
    return { placeholder: 'not_implemented' }
  },

  async createEmbeddings(payload: any) {
    console.warn('createEmbeddings not yet implemented in Rust')
    return { placeholder: 'not_implemented' }
  },

  async getModels() {
    console.warn('getModels not yet implemented in Rust')
    return { placeholder: 'not_implemented' }
  },

  async setupGitHubToken(options: any) {
    console.warn('setupGitHubToken not yet implemented in Rust')
    return { placeholder: 'not_implemented' }
  },

  async refreshToken() {
    console.warn('refreshToken not yet implemented in Rust')
    return { placeholder: 'not_implemented' }
  }
}