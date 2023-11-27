use crate::openapi::ApiDoc;
use crate::ping::controllers::ping;
use crate::s3::client::S3Client;
use crate::settings::Settings;
use crate::registration::controllers::{confirm_registration, register};

use actix_session::{SessionMiddleware, storage::RedisSessionStore};
use actix_web::{App, cookie::{Key, SameSite}, dev::Server, HttpServer, web::{Data, scope}};
use aws_sdk_s3::config::{Builder, Credentials as S3Credentials, Region};
use deadpool_redis::{Config as RedisConfig, Runtime::Tokio1};
use sqlx::{migrate, postgres::{PgPool, PgPoolOptions}};
use std::{env::var, io::Error as IOError, net::TcpListener};
use tracing::{event, Level};
use utoipa_swagger_ui::SwaggerUi;
use utoipa::OpenApi;


pub struct Application {
    port: u16,
    server: Server,
}


impl Application {
    pub async fn build(
        settings: Settings, test_pool: Option<PgPool>
    ) -> Result<Self, IOError> {
        let con_pool = if let Some(pool) = test_pool {
            pool
        } else {
            let db_url = var("DATABASE_URL").expect("Failed to get DATABASE_URL");

            match PgPoolOptions::new().max_connections(5).connect(&db_url).await {
                Ok(pool) => pool,
                Err(e) => {
                    event!(
                        target: "sqlx",
                        Level::ERROR,
                        "Couldn't establish DB connection: {:#?}",
                        e
                    );
                    panic!("Couldn't establish DB connection!")
                }
            }
        };

        migrate!().run(&con_pool).await.expect("Failed to migrate the DB");

        let addr = format!(
            "{}:{}", settings.application.host, settings.application.port
        );
        let listener = TcpListener::bind(&addr)?;
        let port = listener.local_addr().unwrap().port();
        event!(target: "authenticator", Level::DEBUG, "Attempting to run server");
        let server = run(listener, con_pool, settings).await?;

        Ok(Self { port, server })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn run_until_stopped(self) -> Result<(), IOError> {
        self.server.await
    }
}


async fn run(
    listener: TcpListener, db_pool: PgPool, settings: Settings,
) -> Result<Server, IOError> {
    let pool = Data::new(db_pool);

    let redis_url = var("REDIS_URL").expect("Failed to get REDIS_URL");
    let cfg = RedisConfig::from_url(redis_url.clone());
    let redis_pool = cfg.create_pool(
        Some(Tokio1)).expect("Can't create deadpool redis"
    );
    let redis_pool_data = Data::new(redis_pool);
    let s3_client = Data::new(configure_and_return_s3_client().await);

    let secret_key = Key::from(settings.secret.hmac_secret.as_bytes());
    let redis_store = RedisSessionStore::new(redis_url.clone())
        .await.expect("Can't unwrap redis session");

    let openapi = ApiDoc::openapi();

    let server = HttpServer::new(
        move || {
            App::new()
                .wrap(
                    SessionMiddleware::builder(redis_store.clone(), secret_key.clone())
                        .cookie_http_only(true)
                        .cookie_same_site(SameSite::Lax)
                        .cookie_secure(true)
                        .cookie_name("sessionid".to_string())
                        .build(),
                )
                .service(
                    SwaggerUi::new(
                        "/swagger-ui/{_:.*}"
                    )
                    .url(
                        "/api-docs/openapi.json", openapi.clone()
                    )
                )
                .service(
                    scope("/api")
                        .service(ping)
                        .service(
                            scope("/auth")
                                .service(
                                    scope("/registration")
                                        .service(register)
                                        .service(confirm_registration)
                                )
                        )
                )
                .app_data(pool.clone())
                .app_data(redis_pool_data.clone())
                .app_data(s3_client.clone())
        }
    )
    .listen(listener)?
    .run();

    Ok(server)
}


async fn configure_and_return_s3_client() -> S3Client {
    let key = var("AWS_ACCESS_KEY_ID").expect("Failed to get AWS key");
    let key_secret = var("AWS_SECRET_ACCESS_KEY")
        .expect("Failed to get AWS secret key");
    let cred = S3Credentials::new(
        key, key_secret, None, None, "loaded-from-custom-env"
    );

    let region = Region::new(var("AWS_REGION").unwrap_or("eu-west-1".to_string()));
    let config_builder = Builder::new().region(region).credentials_provider(cred);

    let config = config_builder.build();
    S3Client::new(config)
}