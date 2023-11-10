use languages::{
    startup::Application,
};
use dotenv::dotenv;
use std::io::Result;
use tokio::main;
use tracing::{event, Level};

use infra::{
    settings::configure::get_settings,
    tracing::telemetry::{get_subscriber, init_subscriber}
};


#[main]
async fn main() -> Result<()> {
    dotenv().ok();

    let settings = get_settings().expect("Failed to read settings");
    
    let subscriber = get_subscriber(settings.clone().debug);
    init_subscriber(subscriber);

    let application = Application::build(settings, None).await?;

    event!(
        target: "languages", 
        Level::INFO,
        "Listening on http://127.0.0.1:{}",
        application.port()
    );

    application.run_until_stopped().await?;
    Ok(())
}