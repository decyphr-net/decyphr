use config::{Config, ConfigError, Environment as ConfigEnvironment, File};
use infra::settings::entities::{
    ApplicationSettings, DatabaseSettings, Environment, RedisSettings
};
use serde::Deserialize;
use std::env::{current_dir, var};


#[derive(Deserialize, Clone)]
pub struct Settings {
    pub application: ApplicationSettings,
    pub debug: bool,
    pub database: DatabaseSettings,
    pub redis: RedisSettings,
    pub secret: Secret,
    pub email: EmailSettings,
    pub frontend_url: String,
}


#[derive(Deserialize, Clone)]
pub struct Secret {
    pub secret_key: String,
    pub token_expiration: i64,
    pub hmac_secret: String,
}


#[derive(Deserialize, Clone)]
pub struct EmailSettings {
    pub host: String,
    pub host_user: String,
    pub host_user_password: String,
}


/// TODO: update settings in `infra` to decouple the logic that reads from the config
/// files and deserializes the configs
pub fn get_settings() -> Result<Settings, ConfigError> {
    let base_path = current_dir().expect("Failed to determine the current directory");
    let settings_directory = base_path.join("settings");

    let environment: Environment = var("APP_ENVIRONMENT")
        .unwrap_or_else(|_| "development".into())
        .try_into()
        .expect("Failed to parse APP_ENVIRONMENT");
    let environment_filename = format!("{}.yaml", environment.as_str());
    let settings = Config::builder()
        .add_source(File::from(settings_directory.join("base.yaml")))
        .add_source(File::from(settings_directory.join(environment_filename)))
        .add_source(
            ConfigEnvironment::with_prefix("APP").prefix_separator("_").separator("__"),
        )
        .build()?;
    settings.try_deserialize::<Settings>()
}