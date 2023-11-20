use authenticator::startup::Application;
use authenticator::settings::get_settings;

use dotenv::dotenv;
use infra::tracing::telemetry::{get_subscriber, init_subscriber};
use std::io::Result;
use tokio::main as tokio_main;


#[tokio_main]
async fn main() -> Result<()> {
    dotenv().ok();

    let settings = get_settings().expect("Failed to read settings");
    let subscriber = get_subscriber(settings.clone().debug);
    init_subscriber(subscriber);

    let application = Application::build(settings, None).await;
    application.expect("Run failed").run_until_stopped().await?;
    Ok(())
}