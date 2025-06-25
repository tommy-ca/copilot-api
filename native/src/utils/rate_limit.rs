use neon::prelude::*;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::collections::HashMap;

// Global rate limiter state
lazy_static::lazy_static! {
    static ref RATE_LIMITERS: Arc<Mutex<HashMap<String, RateLimiter>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

struct RateLimiter {
    last_request: Option<Instant>,
    interval: Duration,
}

impl RateLimiter {
    fn new(interval_secs: u64) -> Self {
        Self {
            last_request: None,
            interval: Duration::from_secs(interval_secs),
        }
    }
    
    fn check(&mut self) -> bool {
        let now = Instant::now();
        
        if let Some(last_time) = self.last_request {
            if now.duration_since(last_time) < self.interval {
                return false; // Rate limited
            }
        }
        
        self.last_request = Some(now);
        true
    }
}

pub fn check_rate_limit(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    let interval_secs = cx.argument::<JsNumber>(1)?.value(&mut cx) as u64;
    
    let mut limiters = RATE_LIMITERS.lock().unwrap();
    let limiter = limiters
        .entry(key)
        .or_insert_with(|| RateLimiter::new(interval_secs));
    
    let allowed = limiter.check();
    Ok(cx.boolean(allowed))
}