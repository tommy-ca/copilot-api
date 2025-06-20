use axum::{body::{self, Body}, http::{Request, StatusCode}};
use tower::util::ServiceExt;
use rust_gateway::{routes::create_router, state::AppState};
use serde_json::json;
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path};
use std::sync::Arc;

#[tokio::test]
async fn test_root() {
    let state = AppState { base_url: "http://localhost".into(), token: String::new() };
    let app = create_router(Arc::new(state));
    let response = app
        .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    assert_eq!(bytes, "Server running");
}

#[tokio::test]
async fn test_chat_completions_forward() {
    let mock_server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"ok": true})))
        .mount(&mock_server)
        .await;

    let state = AppState { base_url: mock_server.uri(), token: String::new() };
    let app = create_router(Arc::new(state));
    let payload = json!({"foo": "bar"});
    let request = Request::builder()
        .uri("/chat/completions")
        .method("POST")
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(v["ok"], true);
}

#[tokio::test]
async fn test_v1_chat_completions_forward() {
    let mock_server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"ok": true})))
        .mount(&mock_server)
        .await;

    let state = AppState { base_url: mock_server.uri(), token: String::new() };
    let app = create_router(Arc::new(state));
    let payload = json!({"foo": "bar"});
    let request = Request::builder()
        .uri("/v1/chat/completions")
        .method("POST")
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(v["ok"], true);
}

#[tokio::test]
async fn test_models_forward_get() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/models"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"models": []})))
        .mount(&mock_server)
        .await;

    let state = AppState { base_url: mock_server.uri(), token: String::new() };
    let app = create_router(Arc::new(state));
    let request = Request::builder()
        .uri("/models")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(v["models"].is_array());
}

#[tokio::test]
async fn test_v1_models_forward_get() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/models"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"models": []})))
        .mount(&mock_server)
        .await;

    let state = AppState { base_url: mock_server.uri(), token: String::new() };
    let app = create_router(Arc::new(state));
    let request = Request::builder()
        .uri("/v1/models")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(v["models"].is_array());
}

#[tokio::test]
async fn test_embeddings_forward() {
    let mock_server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/embeddings"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"result": []})))
        .mount(&mock_server)
        .await;

    let state = AppState { base_url: mock_server.uri(), token: String::new() };
    let app = create_router(Arc::new(state));
    let payload = json!({"input": "hello"});
    let request = Request::builder()
        .uri("/embeddings")
        .method("POST")
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(v["result"].is_array());
}

#[tokio::test]
async fn test_v1_embeddings_forward() {
    let mock_server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/embeddings"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"result": []})))
        .mount(&mock_server)
        .await;

    let state = AppState { base_url: mock_server.uri(), token: String::new() };
    let app = create_router(Arc::new(state));
    let payload = json!({"input": "hello"});
    let request = Request::builder()
        .uri("/v1/embeddings")
        .method("POST")
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(v["result"].is_array());
}
