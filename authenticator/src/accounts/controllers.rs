use crate::accounts::{forms::UserForm, managers::AccountsManager};

use actix_multipart::form::MultipartForm;
use actix_session::Session;
use actix_web::{web::Data, HttpResponse, patch};
use infra::{
    http::response::entities::{ErrorResponse, SuccessResponse},
    third_party::aws::s3::client::S3Client
};
use sqlx::postgres::PgPool;
use tracing::instrument;
use utoipa::path as openapi_path;


/// Update the details provided for the user in the multipart form
/// 
/// The user will likely only change one or two pieces of their profile at a time,
/// however, at this time, the only pieces of information that a user can update using
/// this endpoint is their name and their thumbnail
/// 
/// If a valid session is not found then return an error stating that the user can't be
/// found. We may also return a generic error if something else goes wrong during the
/// process.
/// 
/// If the details are successfully updated then we just return a success response
/// 
/// # Example usage:
/// ```shell
/// curl --request PATCH \
///     --url http://127.0.0.1:5001/api/auth/accounts/update-user \
///     --header 'Content-Type: multipart/form-data' \
///     --form 'name=New Name" 
/// ```
/// 
/// # Example Response (Success)
/// ```json
/// {
///   "message": "Profile updated successfully!"
/// }
/// ```
/// 
/// # Example Response (Error)
/// ```json
/// {
///   "error": "You are not logged in. Ensure you are logged in and try again"
/// }
/// ```
#[openapi_path(
    patch,
    path = "/api/auth/accounts/update-user",
    tag = "Update user profile",
    params(UserForm),
    responses(
        (status = 200, description = "Updated user account", body = SuccessResponse,),
        (status = 404, description = "Session not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    )
)]
#[instrument(name="Update a user", skip(db_pool, form, session))]
#[patch("/update-user")]
pub async fn update_user_details(
    db_pool: Data<PgPool>,
    form: MultipartForm<UserForm>,
    session: Session,
    s3_client: Data<S3Client>
) -> HttpResponse {
    let manager = AccountsManager {
        db_pool: db_pool
    };

    match manager.update_users_account(form, &session, &s3_client).await {
        Ok(_) => return HttpResponse::Ok().json(
            SuccessResponse {
                message: "Profile updated successfully!".to_string()
            }
        ),
        Err(e) => {
            let err = ErrorResponse {
                error: e
            };

            if err.error == "User was not found" {
                return HttpResponse::NotFound().json(err);
            } else {
                return HttpResponse::InternalServerError().json(err);
            }
        }
    };
}
