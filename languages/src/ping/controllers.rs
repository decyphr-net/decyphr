use actix_web::{
    get,
    HttpResponse,
};
use tracing::{event, instrument, Level};

#[instrument]
#[get("/ping")]
pub async fn ping() -> HttpResponse {
    event!(
        target: "languages", Level::DEBUG, "Accessing ping endpoint"
    );
    HttpResponse::Ok().json("Application is healthy")
}