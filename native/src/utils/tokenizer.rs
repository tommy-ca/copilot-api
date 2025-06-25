use neon::prelude::*;
use serde_json;
use tiktoken_rs::get_bpe_from_model;

#[derive(serde::Deserialize)]
struct Message {
    role: String,
    content: serde_json::Value,
}

#[derive(serde::Deserialize)]
struct TextPart {
    #[serde(rename = "type")]
    part_type: String,
    text: Option<String>,
}

fn is_nullish(value: &serde_json::Value) -> bool {
    value.is_null() || (value.is_string() && value.as_str().unwrap_or("").is_empty())
}

fn extract_content_text(content: &serde_json::Value) -> String {
    match content {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Array(arr) => {
            arr.iter()
                .filter_map(|part| {
                    if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                        part.get("text").and_then(|t| t.as_str()).map(|s| s.to_string())
                    } else {
                        None
                    }
                })
                .collect::<Vec<String>>()
                .join("")
        }
        _ => String::new(),
    }
}

pub fn get_token_count(mut cx: FunctionContext) -> JsResult<JsObject> {
    let messages_json = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Parse messages from JSON
    let raw_messages: Vec<serde_json::Value> = match serde_json::from_str(&messages_json) {
        Ok(msgs) => msgs,
        Err(_) => return cx.throw_error("Invalid JSON input"),
    };
    
    // Get GPT-4o tokenizer to match JavaScript implementation
    let bpe = match get_bpe_from_model("gpt-4o") {
        Ok(bpe) => bpe,
        Err(_) => return cx.throw_error("Failed to load gpt-4o tokenizer"),
    };
    
    // Step 1: Sanitize messages (handle nullish content)
    let sanitized_messages: Vec<serde_json::Value> = raw_messages
        .into_iter()
        .map(|mut message| {
            if let Some(content) = message.get("content") {
                if is_nullish(content) {
                    message["content"] = serde_json::Value::String("".to_string());
                }
            } else {
                message["content"] = serde_json::Value::String("".to_string());
            }
            message
        })
        .collect();
    
    // Step 2: Simplify messages (extract text content)
    let simplified_messages: Vec<serde_json::Value> = sanitized_messages
        .into_iter()
        .map(|mut message| {
            if let Some(content) = message.get("content") {
                let content_text = extract_content_text(content);
                message["content"] = serde_json::Value::String(content_text);
            }
            message
        })
        .collect();
    
    // Step 3: Filter and separate input/output messages
    let filtered_messages: Vec<&serde_json::Value> = simplified_messages
        .iter()
        .filter(|message| {
            message.get("role").and_then(|r| r.as_str()) != Some("tool")
        })
        .collect();
    
    let mut input_messages = &filtered_messages[..];
    let mut output_messages: Vec<&serde_json::Value> = vec![];
    
    // Check if last message is from assistant
    if let Some(last_message) = filtered_messages.last() {
        if last_message.get("role").and_then(|r| r.as_str()) == Some("assistant") {
            if filtered_messages.len() > 1 {
                input_messages = &filtered_messages[..filtered_messages.len() - 1];
            } else {
                input_messages = &[];
            }
            output_messages = vec![*last_message];
        }
    }
    
    // Step 4: Convert to format expected by tiktoken (similar to gpt-tokenizer)
    let input_tokens = if input_messages.is_empty() {
        // Even empty message arrays have base tokens in gpt-tokenizer
        bpe.encode_with_special_tokens("").len()
    } else {
        // Format messages similar to how gpt-tokenizer does it
        let formatted_input: Vec<String> = input_messages
            .iter()
            .map(|msg| {
                format!("{}: {}", 
                    msg.get("role").and_then(|r| r.as_str()).unwrap_or(""),
                    msg.get("content").and_then(|c| c.as_str()).unwrap_or("")
                )
            })
            .collect();
        
        let input_text = formatted_input.join("\n");
        bpe.encode_with_special_tokens(&input_text).len()
    };
    
    let output_tokens = if output_messages.is_empty() {
        // Base tokens for empty output
        bpe.encode_with_special_tokens("").len()
    } else {
        let formatted_output: Vec<String> = output_messages
            .iter()
            .map(|msg| {
                format!("{}: {}", 
                    msg.get("role").and_then(|r| r.as_str()).unwrap_or(""),
                    msg.get("content").and_then(|c| c.as_str()).unwrap_or("")
                )
            })
            .collect();
        
        let output_text = formatted_output.join("\n");
        bpe.encode_with_special_tokens(&output_text).len()
    };
    
    // Create return object
    let result = cx.empty_object();
    let input_val = cx.number(input_tokens as f64);
    let output_val = cx.number(output_tokens as f64);
    
    result.set(&mut cx, "input", input_val)?;
    result.set(&mut cx, "output", output_val)?;
    
    Ok(result)
}