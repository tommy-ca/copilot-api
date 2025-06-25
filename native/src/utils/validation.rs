use neon::prelude::*;
use serde_json;

pub fn validate_payload(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let payload_json = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Try to parse the JSON payload
    let payload: serde_json::Value = match serde_json::from_str(&payload_json) {
        Ok(val) => val,
        Err(_) => return Ok(cx.boolean(false)),
    };
    
    // Basic validation for chat completions payload
    let is_valid = payload.get("messages")
        .and_then(|m| m.as_array())
        .map(|msgs| !msgs.is_empty())
        .unwrap_or(false)
        && payload.get("model")
        .and_then(|m| m.as_str())
        .map(|model| !model.is_empty())
        .unwrap_or(false);
    
    Ok(cx.boolean(is_valid))
}