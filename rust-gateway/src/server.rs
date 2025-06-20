use std::{net::SocketAddr, sync::Arc};

use crate::{state::AppState, routes::create_router};

pub async fn run(addr: SocketAddr, state: AppState) -> anyhow::Result<()> {
    let app = create_router(Arc::new(state));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("Server started at http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
