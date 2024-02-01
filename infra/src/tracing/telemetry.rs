use tracing::{Subscriber, subscriber::set_global_default};
use tracing_subscriber::{EnvFilter, fmt::layer, layer::SubscriberExt, Registry};


pub fn get_subscriber(debug: bool) -> impl Subscriber {
    let env_filter = "info".to_string();

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(
            |_| EnvFilter::new(env_filter)
        );
    
    let stdout = layer().pretty();
    let subscriber = Registry::default()
        .with(env_filter)
        .with(stdout);

    let json_log = Some(layer().json());

    let subscriber = subscriber.with(json_log);
    subscriber
}


pub fn init_subscriber(subscriber: impl Subscriber + Send + Sync) {
    set_global_default(subscriber).expect("Failed to set subscriber");
}