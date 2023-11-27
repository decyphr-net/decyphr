use crate::ping::controllers::ping;
use crate::languages::controllers::get_all_languages;
use crate::openapi::ApiDoc;

use actix_web::{App, dev::Server, HttpServer, web::{Data, scope}};
use infra::settings::entities::{DatabaseSettings, Settings};
use std::{io::Error, net::TcpListener, time::Duration};
use sqlx::{migrate, postgres::{PgPool, PgPoolOptions}};
use utoipa_swagger_ui::SwaggerUi;
use utoipa::OpenApi;


pub struct Application {
    port: u16,
    server: Server,
}

impl Application {
    pub async fn build(
        settings: Settings, test_pool: Option<PgPool>
    ) -> Result<Self, Error> {
        let connection_pool = if let Some(pool) = test_pool {
            pool
        } else {
            get_connection_pool(&settings.database).await
        };

        migrate!().run(&connection_pool).await.expect("Failed to migrate DB");

        let address = format!(
            "{}:{}", settings.application.host, settings.application.port
        );

        let listener = TcpListener::bind(&address)?;
        let port = listener.local_addr().unwrap().port();
        let server = Self::run(listener, connection_pool, settings).await?;

        Ok(Self { port, server })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn run_until_stopped(self) -> Result<(), Error> {
        self.server.await
    }

    pub async fn run(
        listener: TcpListener, db_pool: PgPool, _settings: Settings
    ) -> Result<Server, Error> {
        let pool = Data::new(db_pool);

        let openapi = ApiDoc::openapi();

        let server = HttpServer::new(
            move || {
                App::new()
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
                            scope("/languages").service(get_all_languages)
                        )
                    )
                    .app_data(pool.clone())
            }
        )
        .listen(listener)?
        .run();

        Ok(server)
    }
}

pub async fn get_connection_pool(
    settings: &DatabaseSettings,
) ->  PgPool {
    PgPoolOptions::new()
        .acquire_timeout(Duration::from_secs(2))
        .connect_lazy_with(settings.connect_to_db())
}