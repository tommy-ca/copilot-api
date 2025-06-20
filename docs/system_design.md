# System Design

The gateway exposes a small set of HTTP endpoints. Incoming requests are validated, optionally rate limited, and then forwarded to the Copilot service. Responses are streamed back to the caller when requested.

## Components

- **HTTP Server** – Accepts requests and maps them to service functions. In the Rust rewrite, this is implemented with `axum`.
- **Token Manager** – Handles GitHub authentication and periodically refreshes the Copilot token.
- **Copilot Client** – Performs the actual HTTP calls to the Copilot API.
- **Approval and Rate Limiter** – Optional features controlled via command line flags.

## Data Flow

1. Client sends OpenAI compatible request to the gateway.
2. Gateway verifies tokens are available; if not it triggers authentication.
3. Request is forwarded to GitHub Copilot using `reqwest` and the stored token.
4. Response (streaming or JSON) is returned to the client unchanged.

The system is stateless aside from cached tokens which are stored on disk so multiple runs can reuse the same credentials.
