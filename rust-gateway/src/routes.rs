use axum::{Router, routing::{get, post}};
use std::sync::Arc;

use crate::{handlers::{root, chat_completions, models, embeddings}, state::AppState};

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/", get(root))
        .route("/chat/completions", post(chat_completions))
        .route("/models", get(models))
        .route("/embeddings", post(embeddings))
        .nest(
            "/v1",
            Router::new()
                .route("/chat/completions", post(chat_completions))
                .route("/models", get(models))
                .route("/embeddings", post(embeddings)),
        )
        .with_state(state)
}
