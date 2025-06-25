# Implementation Guide: Node.js + Rust Hybrid Architecture

## Overview

This guide provides step-by-step instructions for implementing the hybrid Node.js + Rust architecture migration for the Copilot API. The goal is to move performance-critical components to Rust native modules while preserving the complete Node.js API surface.

## Prerequisites

Before starting, ensure you have:
- ✅ Bun (>= 1.2.x) - for Node.js package management
- ✅ Rust toolchain (rustc, cargo) - for native module compilation
- ✅ Node.js (>= 18) - for Neon compatibility
- ✅ Git - for version control during migration

```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installations
rustc --version
cargo --version
bun --version
```

## Current Architecture Analysis

### Existing Rust Skeleton Status
The `copilot-api-rs/` directory contains:
- ✅ **Basic Axum server** (`src/main.rs`) - 25 lines, working
- ✅ **Route structure** (`src/routes/mod.rs`) - 4 lines, module exports
- ✅ **Handler placeholders** (4 files) - Return "Hello from X" strings
- ✅ **Dependencies** (`Cargo.toml`) - Core crates defined

**Current State**: Standalone Axum server (needs conversion to Neon native module)

### Node.js Implementation Analysis
Key components to preserve vs. migrate:

**Keep in Node.js** (API Surface):
- `src/main.ts` - CLI interface (Citty)
- `src/server.ts` - HTTP server (Hono)
- `src/routes/*.ts` - Route coordination
- `src/auth.ts` - Auth CLI command

**Migrate to Rust** (Performance Core):
- `src/services/copilot/*` - GitHub API client
- `src/services/github/*` - OAuth and token management  
- `src/lib/token.ts` - Token storage and refresh
- `src/lib/rate-limit.ts` - Rate limiting logic
- `src/lib/tokenizer.ts` - Message tokenization

## Phase 1: Foundation Setup (Weeks 1-2)

### Step 1.1: Convert Rust Skeleton to Neon Module

**1. Update Cargo.toml for Neon:**
```toml
[package]
name = "copilot-api-native"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
# Neon for Node.js bindings
neon = "1.0"

# Async runtime and HTTP client
tokio = { version = "1.45", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "stream"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Error handling
anyhow = "1.0"
thiserror = "2.0"

# Authentication
oauth2 = "4.4"
base64 = "0.22"

# Utilities
uuid = { version = "1.0", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

**2. Replace main.rs with Neon bindings:**
```rust
// native/src/lib.rs
use neon::prelude::*;

mod github;
mod tokenizer;
mod rate_limit;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    // Core API functions
    cx.export_function("createChatCompletions", github::create_chat_completions)?;
    cx.export_function("createEmbeddings", github::create_embeddings)?;
    cx.export_function("getModels", github::get_models)?;
    
    // Token management
    cx.export_function("setupGitHubToken", github::setup_github_token)?;
    cx.export_function("refreshToken", github::refresh_token)?;
    
    // Utilities
    cx.export_function("getTokenCount", tokenizer::get_token_count)?;
    cx.export_function("checkRateLimit", rate_limit::check_rate_limit)?;
    
    Ok(())
}
```

### Step 1.2: Update Package.json for Hybrid Build

```json
{
  "scripts": {
    "build": "npm run build:native && tsup",
    "build:native": "cd native && cargo build --release",
    "dev": "npm run build:native && bun run --watch ./src/main.ts",
    "start": "NODE_ENV=production bun run ./src/main.ts",
    "test": "npm run test:native && npm run test:js",
    "test:native": "cd native && cargo test",
    "test:js": "bun test"
  },
  "devDependencies": {
    "@neon-rs/cli": "^0.1.73"
  }
}
```

### Step 1.3: Create Rust Module Structure

```bash
# Reorganize the Rust code
mkdir -p native/src
mv copilot-api-rs/Cargo.toml native/
mv copilot-api-rs/src/* native/src/
rm -rf copilot-api-rs

# Create module files
mkdir -p native/src/{github,auth,utils}
```

**File Structure After Step 1:**
```
copilot-api/
├── src/                    # Node.js API layer
├── native/                 # Rust native module
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs         # Neon bindings
│   │   ├── github/        # API client
│   │   ├── auth/          # Token management
│   │   └── utils/         # Utilities
└── package.json           # Updated scripts
```

### Step 1.4: Create Integration Test Framework

```typescript
// tests/integration/native-module.test.ts
import { test, expect } from 'bun:test'

test('native module loads correctly', async () => {
  const native = await import('../../native')
  expect(typeof native.getTokenCount).toBe('function')
  expect(typeof native.createChatCompletions).toBe('function')
})

test('basic tokenization works', () => {
  const native = require('../../native')
  const count = native.getTokenCount(JSON.stringify([
    { role: 'user', content: 'Hello world' }
  ]))
  expect(count).toBeGreaterThan(0)
})
```

## Phase 2: Utility Functions (Weeks 3-4)

### Step 2.1: Migrate Tokenization

**Rust Implementation:**
```rust
// native/src/utils/tokenizer.rs
use neon::prelude::*;
use serde_json;

pub fn get_token_count(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let messages_json = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Parse messages
    let messages: Vec<serde_json::Value> = serde_json::from_str(&messages_json)
        .or_else(|_| cx.throw_error("Invalid JSON input"))?;
    
    // Simple token counting (replace with proper tokenizer)
    let mut total_tokens = 0;
    for message in messages {
        if let Some(content) = message.get("content").and_then(|c| c.as_str()) {
            // Rough approximation: 1 token per 4 characters
            total_tokens += content.len() / 4;
        }
    }
    
    Ok(cx.number(total_tokens as f64))
}
```

**Node.js Integration:**
```typescript
// src/lib/rust-core.ts
import { getTokenCount as rustGetTokenCount } from '../../native'
import { getTokenCount as jsGetTokenCount } from './tokenizer'

const USE_RUST_TOKENIZER = process.env.USE_RUST_TOKENIZER === 'true'

export function getTokenCount(messages: any[]): number {
  if (USE_RUST_TOKENIZER) {
    return rustGetTokenCount(JSON.stringify(messages))
  }
  return jsGetTokenCount(messages) // Fallback
}
```

### Step 2.2: Add Feature Flags and Monitoring

```typescript
// src/lib/feature-flags.ts
export const features = {
  USE_RUST_TOKENIZER: process.env.USE_RUST_TOKENIZER === 'true',
  USE_RUST_RATE_LIMIT: process.env.USE_RUST_RATE_LIMIT === 'true',
  USE_RUST_HTTP_CLIENT: process.env.USE_RUST_HTTP_CLIENT === 'true',
  PERFORMANCE_MONITORING: process.env.PERF_MONITOR === 'true'
}

// src/lib/performance.ts
export class PerformanceMonitor {
  static startTimer(operation: string) {
    if (!features.PERFORMANCE_MONITORING) return null
    return {
      operation,
      start: performance.now(),
      end: () => console.log(`${operation}: ${performance.now() - this.start}ms`)
    }
  }
}
```

## Phase 3: GitHub API Client (Weeks 5-8)

### Step 3.1: Migrate Core HTTP Client

```rust
// native/src/github/client.rs
use reqwest::Client;
use serde_json::Value;
use anyhow::Result;

pub struct GitHubClient {
    client: Client,
    token: Option<String>,
}

impl GitHubClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            token: None,
        }
    }
    
    pub async fn create_chat_completions(&self, payload: Value) -> Result<Value> {
        let response = self.client
            .post("https://api.githubcopilot.com/chat/completions")
            .header("Authorization", format!("Bearer {}", self.token.as_ref().unwrap()))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;
            
        let result = response.json::<Value>().await?;
        Ok(result)
    }
}
```

### Step 3.2: Neon Bindings for HTTP Client

```rust
// native/src/github/mod.rs
use neon::prelude::*;
use tokio::runtime::Runtime;

pub fn create_chat_completions(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let payload_str = cx.argument::<JsString>(0)?.value(&mut cx);
    let channel = cx.channel();
    
    let (deferred, promise) = cx.promise();
    
    // Spawn async task
    tokio::spawn(async move {
        let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap();
        let client = GitHubClient::new();
        
        match client.create_chat_completions(payload).await {
            Ok(result) => {
                deferred.settle_with(&channel, move |mut cx| {
                    let result_str = serde_json::to_string(&result).unwrap();
                    Ok(cx.string(result_str))
                });
            }
            Err(e) => {
                deferred.settle_with(&channel, move |mut cx| {
                    cx.throw_error(format!("API error: {}", e))
                });
            }
        }
    });
    
    Ok(promise)
}
```

## Phase 4: Core Chat Engine (Weeks 9-12)

### Step 4.1: Streaming Implementation

```rust
// native/src/streaming/mod.rs
use futures::Stream;
use serde_json::Value;

pub struct StreamingResponse {
    inner: Box<dyn Stream<Item = Result<Value, Box<dyn std::error::Error>>> + Unpin>,
}

impl StreamingResponse {
    pub async fn new(response: reqwest::Response) -> Self {
        // Convert HTTP response to streaming JSON chunks
        // Implementation details for SSE parsing
    }
}
```

### Step 4.2: Update Route Handlers

```typescript
// src/routes/chat-completions/handler.ts (updated)
import { rustCore } from '~/lib/rust-core'
import { features } from '~/lib/feature-flags'

export async function handleCompletion(c: Context) {
  const payload = await c.req.json<ChatCompletionsPayload>()
  
  if (features.USE_RUST_HTTP_CLIENT) {
    // Use Rust implementation
    const response = await rustCore.createChatCompletions(payload)
    
    if (payload.stream) {
      return streamSSE(c, response.stream)
    }
    return c.json(response.data)
  }
  
  // Fallback to original implementation
  return originalHandleCompletion(c)
}
```

## Phase 5: Advanced Features (Weeks 13-16)

### Step 5.1: Rate Limiting in Rust

```rust
// native/src/rate_limit/mod.rs
use std::time::{Duration, Instant};
use std::sync::{Arc, Mutex};

pub struct RateLimiter {
    last_request: Arc<Mutex<Option<Instant>>>,
    interval: Duration,
}

impl RateLimiter {
    pub fn new(interval_secs: u64) -> Self {
        Self {
            last_request: Arc::new(Mutex::new(None)),
            interval: Duration::from_secs(interval_secs),
        }
    }
    
    pub fn check_rate_limit(&self) -> bool {
        let mut last = self.last_request.lock().unwrap();
        let now = Instant::now();
        
        if let Some(last_time) = *last {
            if now.duration_since(last_time) < self.interval {
                return false; // Rate limited
            }
        }
        
        *last = Some(now);
        true
    }
}
```

## Testing Strategy

### Unit Tests
```bash
# Rust tests
cd native && cargo test

# Node.js tests  
bun test
```

### Integration Tests
```typescript
// tests/integration/performance.test.ts
test('Rust vs JS performance comparison', async () => {
  const messages = [{ role: 'user', content: 'test '.repeat(1000) }]
  
  // Benchmark JS implementation
  const jsStart = performance.now()
  const jsResult = jsGetTokenCount(messages)
  const jsTime = performance.now() - jsStart
  
  // Benchmark Rust implementation
  const rustStart = performance.now()
  const rustResult = rustGetTokenCount(messages)
  const rustTime = performance.now() - rustStart
  
  expect(rustResult).toBe(jsResult) // Same result
  expect(rustTime).toBeLessThan(jsTime) // Better performance
})
```

### Performance Benchmarks
```typescript
// tests/benchmarks/stress-test.ts
test('concurrent request handling', async () => {
  const requests = Array(100).fill(null).map(() => 
    fetch('http://localhost:4141/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(testPayload)
    })
  )
  
  const responses = await Promise.all(requests)
  expect(responses.every(r => r.ok)).toBe(true)
})
```

## Migration Validation

### API Compatibility Checklist
- [ ] All CLI commands work identically
- [ ] All HTTP endpoints return same format
- [ ] Streaming responses work correctly
- [ ] Error handling matches original
- [ ] Configuration options preserved
- [ ] Authentication flow unchanged

### Performance Validation
- [ ] 50%+ latency reduction achieved
- [ ] 2x concurrent connection improvement
- [ ] 50% memory usage reduction
- [ ] No performance regressions

### Rollback Plan
1. **Feature flags** allow instant rollback to JS implementation
2. **Dual implementation** runs side-by-side during migration
3. **Automated monitoring** detects performance/compatibility issues
4. **Git branches** maintain clean rollback points

## Production Deployment

### Build Process
```bash
# Production build
npm run build

# Verify native module
node -e "console.log(require('./native'))"

# Start production server
npm run start
```

### Monitoring
- Request latency metrics
- Memory usage tracking  
- Error rate monitoring
- Feature flag usage statistics

## Troubleshooting

### Common Issues

**1. Native Module Won't Load**
```bash
# Rebuild native module
npm run build:native

# Check Node.js compatibility
node --version  # Should be >= 18
```

**2. Performance Regression**
```bash
# Enable performance monitoring
USE_RUST_TOKENIZER=false PERF_MONITOR=true npm start

# Compare metrics before/after
```

**3. API Compatibility Issues**
```bash
# Run integration tests
npm run test

# Use feature flags to isolate issues
USE_RUST_HTTP_CLIENT=false npm start
```

This implementation guide provides the roadmap for successfully migrating to the hybrid architecture while maintaining API compatibility and achieving performance goals.