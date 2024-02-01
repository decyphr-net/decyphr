use crate::ping::managers::PingManager;

use actix_web::{get, HttpResponse, web::{Data}};
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use sqlx::postgres::PgPool;
use tracing::{event, instrument, Level};


/// TODO: Update to include Redis connection
#[instrument(name="Ping", skip(db_pool))]
#[get("/ping")]
pub async fn ping(db_pool: Data<PgPool>) -> HttpResponse {
    event!(target: "authenticator", Level::DEBUG, "Accessing ping endpoint");

    let manager = PingManager {
        db_pool: db_pool.clone(),
    };

    match manager.check_health().await {
        Ok(_) => {
            return HttpResponse::Ok().json(
                SuccessResponse {
                    message: "success".to_string(),
                }
            );
        }
        Err(_) => return HttpResponse::InternalServerError().json(
            ErrorResponse {
                error: "Error reading languages".to_string()
            }
        )
    }
}
