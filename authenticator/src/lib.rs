use minijinja::{Environment as MJEnvironment, Source};
use once_cell::sync::Lazy;

pub mod openapi;
pub mod ping;
pub mod s3;
pub mod settings;
pub mod startup;
pub mod registration;
pub mod tokens;


pub static ENV: Lazy<MJEnvironment<'static>> = Lazy::new(
    || {
        let mut env = MJEnvironment::new();
        env.set_source(Source::from_path("templates"));
        env
    }
);
