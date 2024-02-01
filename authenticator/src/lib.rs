use minijinja::{Environment as MJEnvironment, Source};
use once_cell::sync::Lazy;

pub mod accounts;
pub mod email;
pub mod oauth;
pub mod openapi;
pub mod password;
pub mod ping;
pub mod sessions;
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
