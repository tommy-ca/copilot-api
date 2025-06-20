use axum::{response::IntoResponse, http::StatusCode};
use serde_json::Value;
use std::sync::Arc;

use crate::state::AppState;

pub async fn forward_post(path: &str, state: Arc<AppState>, payload: Value) -> impl IntoResponse {
    let url = format!("{}/{}", state.base_url, path);
    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .bearer_auth(&state.token)
        .json(&payload)
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = StatusCode::from_u16(r.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            match r.text().await {
                Ok(body) => (status, body).into_response(),
                Err(_) => (status, "").into_response(),
            }
        }
        Err(_) => (StatusCode::BAD_GATEWAY, "Upstream request failed").into_response(),
    }
}

pub async fn forward_get(path: &str, state: Arc<AppState>) -> impl IntoResponse {
    let url = format!("{}/{}", state.base_url, path);
    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .bearer_auth(&state.token)
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = StatusCode::from_u16(r.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            match r.text().await {
                Ok(body) => (status, body).into_response(),
                Err(_) => (status, "").into_response(),
            }
        }
        Err(_) => (StatusCode::BAD_GATEWAY, "Upstream request failed").into_response(),
    }
}
