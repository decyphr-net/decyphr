use crate::settings::entities::{Environment, Settings};

use config::{Config, ConfigError, Environment as ConfigEnvironment, File};
use std::env::{current_dir, var};


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