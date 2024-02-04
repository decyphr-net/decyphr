use crate::processor::{entities::TextToProcess, managers::ProcessManager};
use actix_web::{web::{Json, Data}, HttpResponse, post};
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use tracing::instrument;


#[instrument(name = "Process text", skip(text_to_process))]
#[post("/process")]
pub async fn process(Json(text_to_process): Json<TextToProcess>) -> HttpResponse {

    let manager = ProcessManager { };

    return HttpResponse::Ok().json(
        SuccessResponse {
            message: "Ola, Mundo".to_string()
        }
    );
    
    // match manager.process(text_to_process).await {
    //     Ok(response) => {
    //         return HttpResponse::Ok().json(
    //             SuccessResponse {
    //                 message: response
    //             }
    //         );
    //     },
    //     Err(e) => {
    //         return HttpResponse::BadRequest().json(
    //             ErrorResponse {
    //                 error: e
    //             }
    //         );
    //     }
    // };
}
