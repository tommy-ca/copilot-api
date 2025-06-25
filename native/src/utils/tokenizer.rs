use neon::prelude::*;
use serde_json;
use tiktoken_rs::get_bpe_from_model;

pub fn get_token_count(mut cx: FunctionContext) -> JsResult<JsObject> {
    let messages_json = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Parse messages from JSON
    let messages: Vec<serde_json::Value> = match serde_json::from_str(&messages_json) {
        Ok(msgs) => msgs,
        Err(_) => return cx.throw_error("Invalid JSON input"),
    };
    
    // Get GPT-4 tokenizer
    let bpe = match get_bpe_from_model("gpt-4") {
        Ok(bpe) => bpe,
        Err(_) => return cx.throw_error("Failed to load tokenizer"),
    };
    
    let mut input_tokens = 0;
    let mut output_tokens = 0;
    
    // Process messages to count tokens
    for (index, message) in messages.iter().enumerate() {
        if let Some(content) = message.get("content") {
            let content_str = match content {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Array(arr) => {
                    // Handle array content (text + images)
                    arr.iter()
                        .filter_map(|part| {
                            if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                                part.get("text").and_then(|t| t.as_str())
                            } else {
                                None
                            }
                        })
                        .collect::<Vec<&str>>()
                        .join("")
                }
                _ => continue,
            };
            
            if !content_str.is_empty() {
                let tokens = bpe.encode_with_special_tokens(&content_str);
                
                // Check if this is the last message and it's from assistant
                if index == messages.len() - 1 
                    && message.get("role").and_then(|r| r.as_str()) == Some("assistant") {
                    output_tokens += tokens.len();
                } else {
                    input_tokens += tokens.len();
                }
            }
        }
    }
    
    // Create return object
    let result = cx.empty_object();
    let input_val = cx.number(input_tokens as f64);
    let output_val = cx.number(output_tokens as f64);
    
    result.set(&mut cx, "input", input_val)?;
    result.set(&mut cx, "output", output_val)?;
    
    Ok(result)
}