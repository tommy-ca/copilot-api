# Architecture Decision Record (ADR) 001: HTTP Framework Selection for Rust Migration

## Status

Proposed

## Context

We are migrating the Copilot API proxy from TypeScript/Node.js to Rust to improve performance. A critical decision is selecting the HTTP framework that will handle request routing, middleware, and response processing.

### Current Implementation

The TypeScript version uses Hono framework with:
- Simple routing for `/v1/chat/completions`, `/v1/models`, `/v1/embeddings`, `/v1/messages`
- CORS middleware
- Logger middleware
- Streaming support for Server-Sent Events (SSE)

### Requirements

1. High performance and low latency
2. Streaming support for chat completions
3. Middleware support (CORS, logging, rate limiting)
4. JSON request/response handling
5. Easy routing and handler organization
6. Active ecosystem and maintenance

## Decision

We will use **Axum** as the HTTP framework for the Rust implementation.

## Rationale

### Considered Options

1. **Axum**
   - ✅ Built on Hyper and Tower, excellent performance
   - ✅ Strong type safety with extractors
   - ✅ Excellent streaming support
   - ✅ Rich middleware ecosystem via Tower
   - ✅ Active development by Tokio team
   - ✅ Great documentation and community support

2. **Actix-web**
   - ✅ Proven high performance in benchmarks
   - ❌ More complex actor model
   - ❌ Previous maintainer issues (though resolved)
   - ✅ Comprehensive feature set

3. **Warp**
   - ✅ Filter-based composition
   - ❌ Steeper learning curve
   - ❌ Less intuitive for simple REST APIs
   - ✅ Good performance

4. **Rocket**
   - ✅ Django-like familiarity
   - ❌ Requires nightly Rust (until v0.5)
   - ❌ Slower than alternatives

### Key Factors

1. **Performance**: Axum is built on Hyper (HTTP implementation) and Tower (middleware framework), providing excellent performance characteristics.

2. **Streaming**: First-class support for streaming responses, crucial for chat completion endpoints.

3. **Type Safety**: Strong compile-time guarantees for request/response handling through extractors and response types.

4. **Middleware**: Rich ecosystem via Tower middleware for cross-cutting concerns like CORS, logging, and rate limiting.

5. **Maintainability**: Backed by the Tokio team, ensuring long-term maintenance and ecosystem alignment.

## Consequences

### Positive

- High performance HTTP handling with minimal overhead
- Type-safe request/response processing
- Excellent streaming support for chat completions
- Rich middleware ecosystem
- Strong community and documentation
- Good ecosystem alignment with async Rust

### Negative

- Learning curve for developers new to Axum's extractor pattern
- Potential overkill for simple proxy use case
- Dependency on Tower ecosystem

### Migration Impact

- Clear migration path from Hono's handler pattern to Axum extractors
- Middleware conversion from Hono to Tower middleware
- Streaming implementation will be more efficient than current SSE approach

## Implementation Notes

```rust
// Example router structure
use axum::{
    routing::{get, post},
    Router,
};

fn create_router() -> Router {
    Router::new()
        .route("/v1/chat/completions", post(chat_completions_handler))
        .route("/v1/models", get(models_handler))
        .route("/v1/embeddings", post(embeddings_handler))
        .route("/v1/messages", post(messages_handler))
        .layer(cors_layer())
        .layer(logging_layer())
}
```

---

# Architecture Decision Record (ADR) 002: JSON Processing Library Selection

## Status

Proposed

## Context

The Copilot API proxy processes JSON payloads for all API endpoints. Efficient JSON parsing and serialization is critical for performance, especially for large chat completion requests and streaming responses.

### Current Implementation

TypeScript version relies on V8's built-in JSON processing, which is fast but comes with garbage collection overhead.

### Requirements

1. Fast parsing and serialization
2. Zero-copy parsing where possible
3. Schema validation and type safety
4. Support for streaming JSON
5. Memory efficiency
6. Serde integration

## Decision

We will use **serde_json** as the primary JSON processing library, with **simd-json** for performance-critical paths.

## Rationale

### Considered Options

1. **serde_json**
   - ✅ De facto standard in Rust ecosystem
   - ✅ Excellent serde integration
   - ✅ Comprehensive feature set
   - ✅ Battle-tested reliability
   - ❌ Not the fastest option

2. **simd-json**
   - ✅ SIMD-optimized for speed (~2-3x faster)
   - ✅ Drop-in replacement for serde_json
   - ❌ Requires mutable input (not always suitable)
   - ❌ Less mature ecosystem

3. **sonic-rs**
   - ✅ Very fast parsing
   - ❌ Less ecosystem integration
   - ❌ Different API from serde_json

### Hybrid Approach

- **serde_json**: Default for most operations, especially serialization
- **simd-json**: For parsing large request payloads where we control the input buffer

## Consequences

### Positive

- Industry-standard JSON handling with serde_json
- Performance optimization where it matters most with simd-json
- Type safety through serde derive macros
- Zero-allocation parsing in critical paths

### Negative

- Additional complexity with dual JSON libraries
- Need to manage mutable buffers for simd-json

---

# Architecture Decision Record (ADR) 003: Async Runtime Selection

## Status

Proposed

## Context

Rust async runtime selection is crucial for the HTTP server performance and concurrent request handling capabilities.

### Requirements

1. High-performance async I/O
2. HTTP server compatibility
3. Ecosystem support
4. Efficient task scheduling
5. Timer and timeout support

## Decision

We will use **Tokio** as the async runtime.

## Rationale

### Considered Options

1. **Tokio**
   - ✅ Industry standard for async Rust
   - ✅ Excellent HTTP ecosystem support (Hyper, Axum)
   - ✅ Multi-threaded work-stealing scheduler
   - ✅ Rich ecosystem of compatible crates
   - ✅ Excellent documentation and tooling

2. **async-std**
   - ✅ Std-like API
   - ❌ Smaller ecosystem
   - ❌ Less HTTP framework support

3. **smol**
   - ✅ Lightweight
   - ❌ Limited ecosystem
   - ❌ Single-threaded by default

### Key Factors

1. **Ecosystem**: Axum and Hyper are built for Tokio
2. **Performance**: Multi-threaded work-stealing scheduler
3. **Maturity**: Most battle-tested async runtime
4. **Features**: Comprehensive timer, I/O, and synchronization primitives

## Consequences

### Positive

- Best-in-class async performance
- Seamless integration with HTTP stack
- Rich ecosystem support
- Excellent debugging and profiling tools

### Negative

- Heavier than minimal alternatives
- Opinionated runtime choice

---

# Architecture Decision Record (ADR) 004: Token Management and Storage

## Status

Proposed

## Context

The application manages GitHub OAuth tokens and Copilot API tokens with automatic refresh. Storage must be secure, persistent, and efficient.

### Current Implementation

- File-based storage in user directory
- In-memory token caching
- Automatic refresh timers

### Requirements

1. Secure token storage
2. Persistent across restarts
3. Efficient in-memory access
4. Automatic refresh handling
5. Cross-platform compatibility

## Decision

We will use **file-based storage** with **in-memory caching** using `tokio::sync::RwLock` for thread-safe access.

## Rationale

### Storage Options

1. **File-based (chosen)**
   - ✅ Simple and reliable
   - ✅ Cross-platform
   - ✅ No external dependencies
   - ✅ User-controlled location

2. **SQLite**
   - ❌ Overkill for simple key-value storage
   - ❌ Additional dependency

3. **Key-value stores**
   - ❌ External dependency
   - ❌ Deployment complexity

### Concurrency Strategy

```rust
use tokio::sync::RwLock;
use std::sync::Arc;

#[derive(Clone)]
pub struct TokenStore {
    github_token: Arc<RwLock<Option<String>>>,
    copilot_token: Arc<RwLock<Option<String>>>,
}
```

## Consequences

### Positive

- Simple, reliable token persistence
- Efficient concurrent access
- No external dependencies
- Easy migration from current implementation

### Negative

- File I/O for persistence operations
- Manual encryption if needed (future consideration)

---

# Architecture Decision Record (ADR) 005: Error Handling Strategy

## Status

Proposed

## Context

Robust error handling is critical for a proxy service that interfaces with external APIs and handles user authentication.

### Requirements

1. Comprehensive error types
2. HTTP status code mapping
3. User-friendly error messages
4. Debugging information preservation
5. Error propagation efficiency

## Decision

We will use **thiserror** for error definition and **anyhow** for error propagation, with custom error types for domain-specific errors.

## Rationale

### Error Handling Libraries

1. **thiserror + anyhow (chosen)**
   - ✅ thiserror for library errors with custom types
   - ✅ anyhow for application-level error handling
   - ✅ Excellent error context and chaining
   - ✅ Automatic derive macros

2. **eyre**
   - ✅ Rich error reports
   - ❌ Less widespread adoption

3. **failure**
   - ❌ Deprecated in favor of thiserror/anyhow

### Error Architecture

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CopilotApiError {
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),
    
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
    
    #[error("GitHub API error: {status}")]
    GitHubApiError { status: u16 },
    
    #[error("Invalid request: {message}")]
    InvalidRequest { message: String },
}
```

## Consequences

### Positive

- Type-safe error handling
- Rich error context for debugging
- HTTP status code mapping
- Consistent error format across the application

### Negative

- Additional complexity in error type definitions
- Learning curve for error handling patterns

---

# Architecture Decision Record (ADR) 006: Configuration Management

## Status

Proposed

## Context

The application supports various configuration options through CLI arguments, environment variables, and configuration files.

### Current Implementation

- CLI parsing with citty
- Environment variable support
- File-based configuration

### Requirements

1. CLI argument parsing
2. Environment variable override
3. Configuration file support
4. Type-safe configuration
5. Validation and defaults

## Decision

We will use **clap** for CLI parsing and **serde** with **config** crate for configuration management.

## Rationale

### CLI Parsing Options

1. **clap (chosen)**
   - ✅ Most popular and feature-rich
   - ✅ Derive macros for type safety
   - ✅ Automatic help generation
   - ✅ Subcommand support

2. **structopt**
   - ❌ Merged into clap v3+

### Configuration Management

```rust
use clap::Parser;
use serde::{Deserialize, Serialize};

#[derive(Parser, Debug)]
#[command(name = "copilot-api")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub port: u16,
    pub verbose: bool,
    pub rate_limit: Option<u64>,
    // ...
}
```

## Consequences

### Positive

- Type-safe configuration handling
- Automatic CLI help and validation
- Flexible configuration sources
- Easy migration from existing CLI interface

### Negative

- Additional dependencies
- Configuration precedence complexity

This completes the initial set of ADRs covering the major architectural decisions for the Rust migration.