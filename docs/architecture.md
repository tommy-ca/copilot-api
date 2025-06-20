# Solution Architecture

The gateway is written in Rust using the `axum` framework. It is organised into small modules so each concern can be managed separately.

```
Client -> Gateway -> GitHub Copilot API
```

- **Routes**: `/chat/completions`, `/models`, `/embeddings` and their `/v1/*` aliases are defined in `routes.rs`.
- **Handlers**: request handlers live in `handlers.rs` and delegate to the Copilot client.
- **Client**: `client.rs` performs the actual HTTP calls to the Copilot API.
- **State**: runtime state such as tokens and cached model information is stored in the `AppState` struct.
- **CLI**: argument parsing is implemented in `cli.rs` using Clap.

The gateway can be run directly or inside Docker. Rate limiting and manual approval remain optional features to add later.
