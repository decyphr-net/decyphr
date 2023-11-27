// use crate::users::{
//     entities::{
//         general::{
//             ConfirmPasswordChangeParams,
//             UserProfile, 
//             UserVisible, 
//             UserEmail, 
//             UserWithoutProfile,
//             NewPassword
//         },
//         request_bodies::{
//             LoginUser,
//             RegisteringUser,
//             TokenParams
//         }
//     },
//     forms::{UserForm},
//     managers::{
//         UserAuthenticationManager
//     },
// };
use crate::registration::{
    entities::NewUser,
    managers::UserRegistrationManager
};
use crate::tokens::entities::RegistrationConfirmation;
// use crate::settings::get_settings;
// use crate::startup::AppData;
// use crate::types::{
//     ErrorResponse, SuccessResponse,
// };
// use crate::uploads::client::Client;

// use actix_multipart::form::MultipartForm;
// use actix_session::Session;
use actix_web::{
    web::{Json, Data, Query},
    HttpResponse,
    get,
    post,
    patch,
    http::header::LOCATION
};
use deadpool_redis::Pool as RedisPool;
use tracing::{instrument, Level, event,};
// use uuid::Uuid;
use sqlx::{postgres::PgPool};
use utoipa::path as openapi_path;


/// Register a new user
/// 
/// Creates a new user with the provided information. If a user cannot be created, the
/// appropriate error message will be returned
/// 
/// # Example Usage:
/// ```shell
/// curl --request POST \
///  --url http://127.0.0.1:5000/api/users/register \
///  --header 'Content-Type: application/json' \
///  --data '{
///	  "email": "aaronsinnott98@gmail.com",
///	  "name": "Aaron Sinnott",
///	  "password": "password"
///  }'
/// ```
/// 
/// # Example Response (Success):
/// ```json
/// {
///	  "message": "Your account has been created successfully! We have sent you an 
///     activation email for you to activate your account"
/// }
/// ```
/// /// # Example Response (Error):
/// ```json
/// {
///	  "error": "A user with that email address already exists"
/// }
/// ```
#[
    openapi_path(
        get,
        path = "/api/auth/registration/register",
        tag = "Register user",
        params(NewUser),
        responses(
            (status = 200, description = "Regiser New User", body = SuccessResponse,),
            (status = 500, description = "Internal server error", body = ErrorResponse),
        )
    )
]
#[instrument(name = "Adding a new user", skip(new_user, db_pool, redis_pool))]
#[post("/register")]
pub async fn register(
    Json(new_user): Json<NewUser>, db_pool: Data<PgPool>,  redis_pool: Data<RedisPool>,
) -> HttpResponse {
    let manager = UserRegistrationManager {
        db_pool: Some(db_pool.clone()),
        redis_pool: Some(redis_pool.clone()),
    };

    let user_creation_result = manager.create_new_user(new_user).await;

    match user_creation_result {
        Ok(response) => {
            return HttpResponse::Ok().json(response);
        },
        Err(e) => {
            return HttpResponse::BadRequest().json(e);
        }
    }
}


#[instrument(name="Activating a new user", skip(pool, params, redis_pool))]
#[get("/register/confirm")]
pub async fn confirm_registration(
    Query(params): Query<RegistrationConfirmation>,
    pool: Data<PgPool>, 
    redis_pool: Data<RedisPool>,
) -> HttpResponse {

    let manager = UserRegistrationManager {
        db_pool: Some(pool.clone()),
        redis_pool: Some(redis_pool.clone())
    };

    let user_activation_result = manager.confirm_registration(params).await;

    match user_activation_result {
        Ok(res) => {
            HttpResponse::SeeOther()
                .insert_header((LOCATION, res.location)).json(res.message)
        },
        Err(e) => {
            HttpResponse::SeeOther()
                .insert_header((LOCATION, e.location)).json(e.error)
        }
    }
}