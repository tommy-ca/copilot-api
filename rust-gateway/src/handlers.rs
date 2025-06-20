use axum::{extract::{State, Json}, response::IntoResponse};
use serde_json::Value;
use std::sync::Arc;

use crate::{client::forward, state::AppState};

pub async fn root() -> &'static str {
    "Server running"
}

pub async fn chat_completions(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    forward("chat/completions", state, payload).await
}

pub async fn models(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    forward("models", state, payload).await
}

pub async fn embeddings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    forward("embeddings", state, payload).await
}
