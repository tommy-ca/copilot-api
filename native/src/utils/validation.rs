use neon::prelude::*;
use serde_json;

#[derive(serde::Deserialize)]
struct ChatCompletionRequest {
    messages: Vec<serde_json::Value>,
    model: String,
    max_tokens: Option<i32>,
    temperature: Option<f64>,
    stream: Option<bool>,
}

#[derive(serde::Deserialize)]
struct AnthropicRequest {
    messages: Vec<serde_json::Value>,
    model: String,
    max_tokens: i32,
    temperature: Option<f64>,
    stream: Option<bool>,
}

fn validate_message(message: &serde_json::Value) -> bool {
    // Check if message has required role field
    if let Some(role) = message.get("role").and_then(|r| r.as_str()) {
        if !["user", "assistant", "system", "tool"].contains(&role) {
            return false;
        }
    } else {
        return false;
    }
    
    // Check if message has content field
    message.get("content").is_some()
}

fn validate_openai_chat_completion(payload: &serde_json::Value) -> Result<String, String> {
    // Validate messages array
    let messages = payload.get("messages")
        .and_then(|m| m.as_array())
        .ok_or("Missing or invalid 'messages' field")?;
    
    if messages.is_empty() {
        return Err("Messages array cannot be empty".to_string());
    }
    
    // Validate each message
    for (i, message) in messages.iter().enumerate() {
        if !validate_message(message) {
            return Err(format!("Invalid message at index {}", i));
        }
    }
    
    // Validate model field
    let model = payload.get("model")
        .and_then(|m| m.as_str())
        .ok_or("Missing or invalid 'model' field")?;
    
    if model.is_empty() {
        return Err("Model field cannot be empty".to_string());
    }
    
    // Validate optional fields
    if let Some(max_tokens) = payload.get("max_tokens") {
        if let Some(tokens) = max_tokens.as_i64() {
            if tokens <= 0 || tokens > 32000 {
                return Err("max_tokens must be between 1 and 32000".to_string());
            }
        } else {
            return Err("max_tokens must be a number".to_string());
        }
    }
    
    if let Some(temperature) = payload.get("temperature") {
        if let Some(temp) = temperature.as_f64() {
            if temp < 0.0 || temp > 2.0 {
                return Err("temperature must be between 0.0 and 2.0".to_string());
            }
        } else {
            return Err("temperature must be a number".to_string());
        }
    }
    
    // Check for vision content
    let has_vision = messages.iter().any(|msg| {
        if let Some(content) = msg.get("content") {
            if let Some(content_array) = content.as_array() {
                return content_array.iter().any(|part| {
                    part.get("type").and_then(|t| t.as_str()) == Some("image_url")
                });
            }
        }
        false
    });
    
    if has_vision {
        Ok("vision".to_string())
    } else {
        Ok("text".to_string())
    }
}

fn validate_anthropic_request(payload: &serde_json::Value) -> Result<String, String> {
    // Similar validation for Anthropic format
    let messages = payload.get("messages")
        .and_then(|m| m.as_array())
        .ok_or("Missing or invalid 'messages' field")?;
    
    if messages.is_empty() {
        return Err("Messages array cannot be empty".to_string());
    }
    
    // Validate each message
    for (i, message) in messages.iter().enumerate() {
        if !validate_message(message) {
            return Err(format!("Invalid message at index {}", i));
        }
    }
    
    // Validate required max_tokens for Anthropic
    let max_tokens = payload.get("max_tokens")
        .and_then(|m| m.as_i64())
        .ok_or("Missing or invalid 'max_tokens' field (required for Anthropic)")?;
    
    if max_tokens <= 0 || max_tokens > 32000 {
        return Err("max_tokens must be between 1 and 32000".to_string());
    }
    
    Ok("anthropic".to_string())
}

pub fn validate_payload(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let payload_json = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Try to parse the JSON payload
    let payload: serde_json::Value = match serde_json::from_str(&payload_json) {
        Ok(val) => val,
        Err(_) => return Ok(cx.boolean(false)),
    };
    
    // Try OpenAI format first
    let is_valid = validate_openai_chat_completion(&payload).is_ok() || 
                   validate_anthropic_request(&payload).is_ok();
    
    Ok(cx.boolean(is_valid))
}

// Detailed validation with error messages
pub fn validate_payload_detailed(mut cx: FunctionContext) -> JsResult<JsObject> {
    let payload_json = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Try to parse the JSON payload
    let payload: serde_json::Value = match serde_json::from_str(&payload_json) {
        Ok(val) => val,
        Err(e) => {
            let result = cx.empty_object();
            let valid = cx.boolean(false);
            let error = cx.string(format!("Invalid JSON: {}", e));
            
            result.set(&mut cx, "valid", valid)?;
            result.set(&mut cx, "error", error)?;
            return Ok(result);
        }
    };
    
    // Try OpenAI format first
    let (is_valid, error_message, content_type) = match validate_openai_chat_completion(&payload) {
        Ok(content_type) => (true, None, Some(content_type)),
        Err(e) => {
            // Try Anthropic format
            match validate_anthropic_request(&payload) {
                Ok(content_type) => (true, None, Some(content_type)),
                Err(e2) => (false, Some(format!("OpenAI validation: {}. Anthropic validation: {}", e, e2)), None)
            }
        }
    };
    
    let result = cx.empty_object();
    let valid = cx.boolean(is_valid);
    result.set(&mut cx, "valid", valid)?;
    
    if let Some(error) = error_message {
        let error_str = cx.string(error);
        result.set(&mut cx, "error", error_str)?;
    }
    
    if let Some(content_type) = content_type {
        let content_type_str = cx.string(content_type);
        result.set(&mut cx, "contentType", content_type_str)?;
    }
    
    Ok(result)
}