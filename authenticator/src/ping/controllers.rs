use crate::ping::managers::PingManager;

use actix_web::{get, HttpResponse, web::{Data}};
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use sqlx::postgres::PgPool;
use tracing::{event, instrument, Level};


#[instrument(name="Ping", skip(db_pool))]
#[get("/ping")]
pub async fn ping(db_pool: Data<PgPool>) -> HttpResponse {
    event!(target: "authenticator", Level::DEBUG, "Accessing ping endpoint");

    let manager = PingManager {
        db_pool: db_pool.clone(),
    };

    match manager.check_health().await {
        Ok(_res) => {
            return HttpResponse::Ok().json(
                SuccessResponse {
                    message: "success".to_string(),
                }
            );
        }
        Err(_e) => return HttpResponse::InternalServerError().json(
            ErrorResponse {
                error: "Error reading languages".to_string()
            }
        )
    }

    // let mut transaction = match db_pool.begin().await {
    //     Ok(transaction) => transaction,
    //     Err(e) => {
    //         event!(
    //             target: "authenticator",
    //             Level::ERROR,
    //             "Unable to begin DB transaction: {:#?}",
    //             e
    //         );
    //         return HttpResponse::InternalServerError().json(
    //             ErrorResponse {
    //                 error: "Something unexpected happened. Try again".to_string()
    //             },
    //         );
    //     }
    // };

    // let con_exists = query_as!(DBResponse, "SELECT 1 AS con_exists")
    //     .fetch_one(&mut *transaction).await;


    // match con_exists {
    //     Ok(_response) => {
    //         let http_response = json!(
    //             SuccessResponse {
    //                 message: "success".to_string(),
    //             }
    //         );

    //         return HttpResponse::Ok().json(http_response);
    //     }
    //     Err(e) => {
    //         let http_response = json!(
    //             ErrorResponse {
    //                 error: format!("{:?}", e)
    //             }
    //         );
    //         return HttpResponse::InternalServerError().json(http_response);
    //     }
    // }
}