use clap::Parser;

use rust_gateway::{cli::{Cli, Command}, state::AppState, server};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Start { port, verbose } => {
            if verbose {
                println!("Verbose mode enabled");
            }
            let base_url = std::env::var("COPILOT_BASE_URL")
                .unwrap_or_else(|_| "https://api.githubcopilot.com".to_string());
            let token = std::env::var("COPILOT_TOKEN").unwrap_or_default();
            let state = AppState { base_url, token };
            let addr = ([0, 0, 0, 0], port).into();
            server::run(addr, state).await?;
        }
        Command::Auth => {
            println!("Authentication flow not implemented in this example");
        }
    }
    Ok(())
}
