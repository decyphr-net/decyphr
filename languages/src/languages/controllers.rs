use crate::languages::{
    entities::ErrorResponse,
    managers::LanguageManager
};

use actix_web::{get, HttpResponse, web::{Data}};
use sqlx::postgres::PgPool;
use tracing::{instrument};
use utoipa::path as openapi_path;


#[
    openapi_path(
        get,
        path = "/api/languages/all",
        tag = "Get all languages endpoint",
        responses(
            (
                status = 200,
                description = "Get all of the supported lanugages",
                body = Vec<Language>,
            ),
            (
                status = 500,
                description = "Internal server error",
                body = ErrorResponse,
            ),
        )
    )
]
#[instrument(name="Getting all languages", skip(db_pool))]
#[get("/all")]
pub async fn get_all_languages(db_pool: Data<PgPool>) -> HttpResponse {
    let manager = LanguageManager {
        db_pool: db_pool.clone(),
    };
    match manager.get_languages().await {
        Ok(languages) => return HttpResponse::Ok().json(languages),
        Err(_e) => return HttpResponse::InternalServerError().json(
            ErrorResponse {
                error: "Error reading languages".to_string()
            }
        )
    };
}
