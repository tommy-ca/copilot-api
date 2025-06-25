# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status: Hybrid Node.js + Rust Architecture Migration

**Current Status**: Planning phase for migrating core performance components to Rust while preserving the Node.js API surface.

### Migration Strategy
- **Keep in Node.js**: CLI interface, HTTP server/routing, configuration management
- **Migrate to Rust**: Core processing engine, GitHub API client, token management, streaming, rate limiting
- **Integration Method**: Neon native modules for direct Node.js ↔ Rust communication
- **API Guarantee**: Zero breaking changes - same CLI commands, HTTP endpoints, and request/response formats

## Development Commands

### Current (Node.js/TypeScript)
- **Install dependencies**: `bun install`
- **Build**: `bun run build`
- **Dev server (watch)**: `bun run dev`
- **Production start**: `bun run start`
- **Lint**: `bun run lint`
- **Pre-commit lint/fix**: Runs automatically via git hooks (bunx eslint --fix)

### Future (Hybrid Node.js + Rust)
- **Install dependencies**: `bun install` (includes Rust compilation)
- **Build native + JS**: `bun run build` (builds both Rust native module and TypeScript)
- **Build Rust only**: `bun run build:native`
- **Dev server (watch)**: `bun run dev` (rebuilds native module as needed)
- **Production start**: `bun run start` (same as current)
- **Lint**: `bun run lint` (TypeScript only, Rust has `cargo clippy`)

## Architecture Overview

### Current Implementation (TypeScript/Node.js)
- **Entry point**: `src/main.ts` defines CLI subcommands (`start` and `auth`) for the Copilot API server and authentication flow.
- **Server**: `src/server.ts` sets up HTTP routes using Hono, maps OpenAI/Anthropic-compatible endpoints, and handles logging/cors.
- **Routes**: Handlers for chat completions, embeddings, models, and messages are under `src/routes/`, providing API endpoints compatible with OpenAI and Anthropic APIs.
- **Copilot communication**: `src/services/copilot/` contains methods for proxying requests (chat completions, model listing, embeddings) to the GitHub Copilot backend using user tokens.
- **Lib utilities**: `src/lib/` contains configuration, token, model caching, and error handling helpers.
- **Authentication**: `src/auth.ts` provides the CLI handler for authenticating with GitHub, managing required tokens, and persisting them locally.

### Target Hybrid Architecture (Node.js API + Rust Core)
- **Node.js Layer** (API surface - no external changes):
  - `src/main.ts` - CLI entry point (unchanged)
  - `src/server.ts` - HTTP server and routing (unchanged)
  - `src/routes/*` - Route handlers (updated to call Rust core)
  - `src/auth.ts` - Auth CLI command (minimal changes)
  - `src/lib/rust-core.ts` - New: Rust module bindings

- **Rust Core Layer** (performance engine):
  - `native/src/lib.rs` - Neon bindings for Node.js integration
  - `native/src/api/` - GitHub Copilot API client (migrated from `src/services/`)
  - `native/src/auth/` - Token management and refresh (migrated from `src/lib/token.ts`)
  - `native/src/streaming/` - SSE streaming engine (migrated from streaming logic)
  - `native/src/processing/` - Request/response processing and validation

### Migration Components Status

**✅ Planned for Rust Migration (Performance Critical)**:
- GitHub API client (`services/copilot/*`, `services/github/*`)
- Token management and refresh (`lib/token.ts`, `lib/state.ts`)
- Request processing and validation
- Streaming response handling
- Rate limiting (`lib/rate-limit.ts`)
- Message translation (`routes/messages/*` - Anthropic ↔ OpenAI)  
- Tokenization (`lib/tokenizer.ts`)
- Caching layer

**🟡 Staying in Node.js (API Layer)**:
- CLI interface (`main.ts`, `auth.ts`)
- HTTP server setup (`server.ts`)
- Route handlers coordination (`routes/*.ts`)
- Configuration loading and validation
- Error handling coordination
- Logging and middleware

## API Endpoints

- **OpenAI-compatible**:
  - `POST /v1/chat/completions`
  - `GET /v1/models`
  - `POST /v1/embeddings`
- **Anthropic-compatible**:
  - `POST /v1/messages`
  - `POST /v1/messages/count_tokens`

## Migration Timeline & Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up Neon native module structure
- Implement basic Node.js ↔ Rust communication
- Update build system and package.json
- Create integration tests

### Phase 2: Utility Functions (Weeks 3-4)  
- Migrate tokenization (`lib/tokenizer.ts`)
- Migrate validation logic
- Add performance benchmarking
- Feature flags for gradual rollout

### Phase 3: GitHub API Client (Weeks 5-8)
- Migrate GitHub OAuth flow (`services/github/*`)
- Migrate Copilot API client (`services/copilot/*`)
- Implement connection pooling
- Add comprehensive error handling

### Phase 4: Core Chat Engine (Weeks 9-12)
- Migrate chat completions processing
- Implement streaming engine
- Handle vision model detection
- Performance optimization

### Phase 5: Advanced Features (Weeks 13-16)
- Migrate rate limiting (`lib/rate-limit.ts`)
- Migrate Anthropic translation (`routes/messages/*`)
- Token management and caching
- Final performance tuning

## Performance Targets

**Current Baseline (Node.js/TypeScript)**:
- Request latency: ~10-50ms overhead
- Memory usage: ~50-100MB baseline  
- Concurrent connections: ~100-500 efficient
- CPU usage: High under load (V8 overhead)

**Target Performance (Hybrid Node.js + Rust)**:
- Request latency: <5-25ms overhead (50%+ improvement)
- Memory usage: <25-50MB baseline (50%+ reduction)  
- Concurrent connections: >1000 efficient (2x+ improvement)
- CPU usage: Significantly reduced under load

## Other Notes

- Ensure Bun (>= 1.2.x) is installed for all scripts and local dev.
- Rust toolchain required for native module compilation (cargo, rustc)
- Tokens and cache are handled automatically; manual authentication can be forced with the `auth` subcommand.
- No .cursorrules, .github/copilot-instructions.md, or .cursor/rules found, so follow typical TypeScript/Bun/ESLint conventions as seen in this codebase.
- For Rust code, follow standard Rust conventions and use `cargo clippy` for linting.
