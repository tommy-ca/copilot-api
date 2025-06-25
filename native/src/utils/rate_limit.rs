use neon::prelude::*;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::collections::HashMap;

// Enhanced rate limiter with memory management and burst handling
#[derive(Clone)]
struct RateLimiter {
    last_request: Option<Instant>,
    interval: Duration,
    burst_capacity: u32,
    current_tokens: u32,
    last_refill: Instant,
}

impl RateLimiter {
    fn new(interval_secs: u64) -> Self {
        Self {
            last_request: None,
            interval: Duration::from_secs(interval_secs),
            burst_capacity: 5, // Allow burst of 5 requests
            current_tokens: 5,
            last_refill: Instant::now(),
        }
    }
    
    fn new_with_burst(interval_secs: u64, burst_capacity: u32) -> Self {
        Self {
            last_request: None,
            interval: Duration::from_secs(interval_secs),
            burst_capacity,
            current_tokens: burst_capacity,
            last_refill: Instant::now(),
        }
    }
    
    fn check(&mut self) -> bool {
        let now = Instant::now();
        
        // Refill tokens based on time passed
        let time_since_refill = now.duration_since(self.last_refill);
        let tokens_to_add = (time_since_refill.as_secs_f64() / self.interval.as_secs_f64()) as u32;
        
        if tokens_to_add > 0 {
            self.current_tokens = (self.current_tokens + tokens_to_add).min(self.burst_capacity);
            self.last_refill = now;
        }
        
        // Check if we have tokens available
        if self.current_tokens > 0 {
            self.current_tokens -= 1;
            self.last_request = Some(now);
            true
        } else {
            false // Rate limited
        }
    }
    
    fn is_expired(&self, max_idle_duration: Duration) -> bool {
        if let Some(last_time) = self.last_request {
            Instant::now().duration_since(last_time) > max_idle_duration
        } else {
            false
        }
    }
}

// Global rate limiter state with automatic cleanup
lazy_static::lazy_static! {
    static ref RATE_LIMITERS: Arc<Mutex<HashMap<String, RateLimiter>>> = 
        Arc::new(Mutex::new(HashMap::new()));
    static ref LAST_CLEANUP: Arc<Mutex<Instant>> = 
        Arc::new(Mutex::new(Instant::now()));
}

const CLEANUP_INTERVAL: Duration = Duration::from_secs(300); // Cleanup every 5 minutes
const MAX_IDLE_DURATION: Duration = Duration::from_secs(3600); // Remove limiters idle for 1 hour

fn cleanup_expired_limiters() {
    let mut last_cleanup = LAST_CLEANUP.lock().unwrap();
    let now = Instant::now();
    
    if now.duration_since(*last_cleanup) < CLEANUP_INTERVAL {
        return; // Too early for cleanup
    }
    
    let mut limiters = RATE_LIMITERS.lock().unwrap();
    limiters.retain(|_, limiter| !limiter.is_expired(MAX_IDLE_DURATION));
    
    *last_cleanup = now;
}

pub fn check_rate_limit(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    let interval_secs = cx.argument::<JsNumber>(1)?.value(&mut cx) as u64;
    
    // Optional third argument for burst capacity
    let burst_capacity = if cx.len() > 2 {
        cx.argument::<JsNumber>(2)?.value(&mut cx) as u32
    } else {
        5 // Default burst capacity
    };
    
    // Cleanup expired limiters periodically
    cleanup_expired_limiters();
    
    let mut limiters = RATE_LIMITERS.lock().unwrap();
    let limiter = limiters
        .entry(key)
        .or_insert_with(|| RateLimiter::new_with_burst(interval_secs, burst_capacity));
    
    let allowed = limiter.check();
    Ok(cx.boolean(allowed))
}

// Additional function to get rate limiter stats
pub fn get_rate_limit_stats(mut cx: FunctionContext) -> JsResult<JsObject> {
    let limiters = RATE_LIMITERS.lock().unwrap();
    
    let result = cx.empty_object();
    let active_limiters = cx.number(limiters.len() as f64);
    
    result.set(&mut cx, "activeLimiters", active_limiters)?;
    
    Ok(result)
}

// Function to reset a specific rate limiter
pub fn reset_rate_limit(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let mut limiters = RATE_LIMITERS.lock().unwrap();
    let removed = limiters.remove(&key).is_some();
    
    Ok(cx.boolean(removed))
}