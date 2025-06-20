use axum::{extract::{State, Json}, response::IntoResponse};
use serde_json::Value;
use std::sync::Arc;

use crate::{client::{forward_post, forward_get}, state::AppState};

pub async fn root() -> &'static str {
    "Server running"
}

pub async fn chat_completions(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    forward_post("chat/completions", state, payload).await
}

pub async fn models(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    forward_get("models", state).await
}

pub async fn embeddings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    forward_post("embeddings", state, payload).await
}
