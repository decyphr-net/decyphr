use crate::registration::{
    entities::{NewUser, UserEmail},
    managers::UserRegistrationManager,
    strategies::basic::BasicAuth
};
use crate::tokens::{
    entities::RegistrationConfirmation,
    managers::TokenManager
};
use infra::http::response::entities::{ErrorResponse, SuccessResponse};

use actix_web::{
    web::{Json, Data, Query}, HttpResponse, get, post, http::header::LOCATION
};
use deadpool_redis::Pool as RedisPool;
use tracing::instrument;
use sqlx::postgres::PgPool;
use utoipa::path as openapi_path;


/// Register a new user
/// 
/// Creates a new user with the provided information. If a user cannot be created, the
/// appropriate error message will be returned
/// 
/// # Example Usage:
/// ```shell
/// curl --request POST \
///  --url http://127.0.0.1:5000/api/auth/registration/register \
///  --header 'Content-Type: application/json' \
///  --data '{
///	  "email": "user@email.com",
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
/// # Example Response (Error):
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
    let strategy = BasicAuth {
        db_pool: db_pool.clone(),
        redis_pool: redis_pool.clone(),
    };

    match strategy.create_user(new_user).await {
        Ok(response) => {
            return HttpResponse::Ok().json(
                SuccessResponse {
                    message: response
                }
            );
        },
        Err(e) => {
            return HttpResponse::BadRequest().json(
                ErrorResponse {
                    error: e
                }
            );
        }
    };
}


/// Activates a user's account based on the token provided in the query params
/// 
/// The user will receive this link in an email and when they click on that link they
/// will be directed to this endpoint. This endpoint will redirect to the FE with the
/// appropriate response message for the user
/// 
/// If a user has all ready activated their account, or, the activation key stored in
/// Redis has expired, then the user will receive an error message informing them of
/// this.
/// 
/// Or, if the user is activated successfully, active the account in the DB, delete the
/// token from Redis and return to the client with a success message
/// 
/// # Example Usage:
/// ```shell
/// curl --request POST \
///  --url http://127.0.0.1:5001/api/auth/registration/register/confirm?token=<TOKEN>
/// ```
#[
    openapi_path(
        get,
        path = "/api/auth/registration/register/confirm",
        tag = "Activate a user's account",
        params(RegistrationConfirmation),
        responses(
            (status = 303, description = "User account activated", body = SuccessResponse,),
            (status = 303, description = "Expired token", body = ErrorResponse),
            (status = 303, description = "Redis connection failure", body = ErrorResponse),
        )
    )
]
#[instrument(name="Activating a new user", skip(pool, params, redis_pool))]
#[get("/register/confirm")]
pub async fn confirm_registration(
    Query(params): Query<RegistrationConfirmation>,
    pool: Data<PgPool>, 
    redis_pool: Data<RedisPool>,
) -> HttpResponse {

    let manager = UserRegistrationManager {
        db_pool: pool.clone(),
        redis_pool: Some(redis_pool.clone()),
        token_manager: Some(TokenManager {})
    };

    match manager.confirm_registration(params).await {
        Ok(res) => {
            return HttpResponse::SeeOther()
                .insert_header((LOCATION, res.location)).json(res.message)
        },
        Err(e) => {
            return HttpResponse::SeeOther()
                .insert_header((LOCATION, e.location)).json(e.error)
        }
    };
}


/// Regenerate a user's activation token in the event that their token expired
/// 
/// Activation tokens expire after a short period of time. If the user was unable to 
/// activate their account in the given timeframe then they can use this endpoint to
/// get a new token.
/// 
/// This process will follow the same steps that the `/register` endpoint follows in
/// order to send the token originally, with the small difference that it will check 
/// to ensure that the user with the provided email address, has not all ready activated
/// their account 
/// 
/// /// # Example Usage:
/// ```shell
/// curl --request POST \
///  --url http://127.0.0.1:50001/api/auth/registration/regenerate-token \
///  --header 'Content-Type: application/json' \
///  --data '{
///	  "email": "user@email.com",
///  }'
/// ```
/// 
/// # Example Response (Success):
/// ```json
/// {
///	  "message": "Account activation link has been sent successfully"
/// }
/// ```
/// /// # Example Response (Error):
/// ```json
/// {
///	  "error": "User not found"
/// }
/// ```
#[
    openapi_path(
        get,
        path = "/api/auth/registration/regenerate-token",
        tag = "Regenerate a user's activation token",
        params(UserEmail),
        responses(
            (status = 200, description = "Regenerate Token", body = SuccessResponse,),
            (status = 404, description = "User Not Found", body = ErrorResponse),
        )
    )
]
#[instrument(name="Regenerate token for a user", skip(pool, redis_pool))]
#[post("/regenerate-token")]
pub async fn regenerate_token(
    Json(user_email): Json<UserEmail>, pool: Data<PgPool>, redis_pool: Data<RedisPool>
) -> HttpResponse {
    let manager = UserRegistrationManager {
        db_pool: pool.clone(),
        redis_pool: Some(redis_pool.clone()),
        token_manager: Some(TokenManager {})
    };

    match manager.regenerate_token(&user_email.email).await {
        Ok(res) => {
            return HttpResponse::Ok().json(
                SuccessResponse {
                    message: res
                }
            )
        }
        Err(e) => {
            return HttpResponse::NotFound().json(
                ErrorResponse {
                    error: e
                }
            )
        }
    };
}
