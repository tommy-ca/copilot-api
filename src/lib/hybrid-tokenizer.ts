import type { Message } from "~/services/copilot/create-chat-completions"
import { getTokenCount as jsGetTokenCount } from "./tokenizer"
import { rustCore, features, PerformanceMonitor } from "./rust-core"

// Async version for when we can update callers
export const getTokenCountAsync = async (messages: Array<Message>) => {
  if (features.USE_RUST_TOKENIZER) {
    const timer = PerformanceMonitor.startTimer('hybrid_tokenizer_rust')
    
    try {
      const result = await rustCore.getTokenCount(messages)
      timer?.end()
      return result
    } catch (error) {
      timer?.end()
      console.warn('Rust tokenizer failed, falling back to JavaScript:', error)
      
      // Fallback to JavaScript implementation
      const fallbackTimer = PerformanceMonitor.startTimer('hybrid_tokenizer_fallback')
      const result = jsGetTokenCount(messages)
      fallbackTimer?.end()
      return result
    }
  }
  
  // Use JavaScript implementation by default
  const timer = PerformanceMonitor.startTimer('hybrid_tokenizer_js')
  const result = jsGetTokenCount(messages)
  timer?.end()
  return result
}

// Synchronous version for backward compatibility
export const getTokenCount = (messages: Array<Message>) => {
  // For now, always use JavaScript for synchronous calls
  // TODO: Phase 3 will update all callers to use async version
  const timer = PerformanceMonitor.startTimer('hybrid_tokenizer_js_sync')
  const result = jsGetTokenCount(messages)
  timer?.end()
  return result
}