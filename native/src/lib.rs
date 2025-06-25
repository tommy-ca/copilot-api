use neon::prelude::*;

mod github;
mod auth;
mod utils;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    // Utility functions
    cx.export_function("getTokenCount", utils::tokenizer::get_token_count)?;
    
    // GitHub API client functions
    cx.export_function("createChatCompletions", github::create_chat_completions)?;
    cx.export_function("createEmbeddings", github::create_embeddings)?;
    cx.export_function("getModels", github::get_models)?;
    
    // Authentication functions
    cx.export_function("setupGitHubToken", auth::setup_github_token)?;
    cx.export_function("refreshToken", auth::refresh_token)?;
    
    // Rate limiting and validation
    cx.export_function("checkRateLimit", utils::rate_limit::check_rate_limit)?;
    cx.export_function("getRateLimitStats", utils::rate_limit::get_rate_limit_stats)?;
    cx.export_function("resetRateLimit", utils::rate_limit::reset_rate_limit)?;
    cx.export_function("validatePayload", utils::validation::validate_payload)?;
    cx.export_function("validatePayloadDetailed", utils::validation::validate_payload_detailed)?;
    
    Ok(())
}