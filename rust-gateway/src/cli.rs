use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(author, version, about = "Rust based AI Gateway")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Subcommand)]
pub enum Command {
    /// Start the API server
    Start {
        #[arg(short, long, default_value = "4141")]
        port: u16,
        #[arg(short, long, default_value_t = false)]
        verbose: bool,
    },
    /// Run authentication flow
    Auth,
}
