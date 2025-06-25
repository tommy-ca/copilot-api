import type { Message } from "~/services/copilot/create-chat-completions"
import { getTokenCount as jsGetTokenCount } from "./tokenizer"
import { rustCore, features, PerformanceMonitor } from "./rust-core"

export const getTokenCount = (messages: Array<Message>) => {
  if (features.USE_RUST_TOKENIZER) {
    const timer = PerformanceMonitor.startTimer('hybrid_tokenizer_rust')
    
    try {
      const result = rustCore.getTokenCount(messages)
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