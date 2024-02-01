use crate::sessions::{managers::SessionManager, entities::{LoginUser}};
use actix_session::Session;
use actix_web::{web::{Json, Data}, HttpResponse, get, post,};
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use tracing::instrument;
use sqlx::PgPool;
use utoipa::path as openapi_path;


/// Login a user
/// 
/// Login a user using the provided credentials. If user cannot be logged in, the 
/// appropriate error message will be returned
/// 
/// # Example Usage:
/// ```shell
/// curl --request POST \
///  --url http://127.0.0.1:5000/api/auth/sessions/login \
///  --header 'Content-Type: application/json' \
///  --data '{
/// 	"email": "email@domain.com",
/// 	"password": "password"
///  }'
/// ```
/// 
/// # Example Response (Success):
/// ```json
/// {
/// 	"id": "99cd0418-f26d-4cc0-b035-071c8b20949b",
/// 	"email": "email@domain.com",
/// 	"name": "User's Name",
/// 	"is_active": true,
/// 	"is_staff": false,
/// 	"is_superuser": false,
/// 	"thumbnail": null,
/// 	"date_joined": "2023-12-26T11:44:03.237635Z",
/// 	"profile": {
/// 		"id": "85296af6-d07b-45ca-8d22-7ad5a19e3a76",
/// 		"user_id": "99cd0418-f26d-4cc0-b035-071c8b20949b",
/// 	}
/// }
/// ```
/// # Example Response (Bad Credentials Error):
/// ```json
/// {
///	  "error": "Email and password do not match"
/// }
/// ```
/// 
/// # Example Response (User Not Found Error):
/// ```json
/// {
///	  "error": "A user with these details does not exist. If you registered with these 
///         details, ensure you activate your account by clicking on the link sent to 
///         your e-mail address"
/// }
/// ```
#[
    openapi_path(
        get,
        path = "/api/auth/sessions/login",
        tag = "Login user",
        params(LoginUser),
        responses(
            (status = 200, description = "Logged in user", body = UserVisible,),
            (status = 400, description = "Invalid credentials", body = ErrorResponse),
            (status = 404, description = "User not found", body = ErrorResponse),
        )
    )
]
#[instrument(name="Logging in a user", skip(db_pool, user, session))]
#[post("/login")]
pub async fn login(
    db_pool: Data<PgPool>, user: Json<LoginUser>, session: Session
) -> HttpResponse {
    let session_manager = SessionManager {
        db_pool: Some(db_pool)
    };

    match session_manager.login(user, session).await {
        Ok(res) => return HttpResponse::Ok().json(res),
        Err(e) => {
            let response = ErrorResponse {
                error: e
            };

            if response.error == "Email and password do not match".to_string() {
                return HttpResponse::BadRequest().json(response)
            } else {
                return HttpResponse::NotFound().json(response)
            }
        }
    };
}


/// Logout a user
/// 
/// Logout the user contained in the session provided by the request. If the user can't 
/// be logged out, return the appropriate error message
/// 
/// # Example Usage:
/// ```shell
/// curl --request GET --url http://127.0.0.1:5000/api/auth/sessions/logout
/// ```
/// 
/// # Example Response (Success):
/// ```json
/// {
/// 	"message": "You have successfully logged out"
/// }
/// ```
/// # Example Response (No Valid Session Error):
/// ```json
/// {
///	  "error": 
///     "We are experiencing some issues. Please ensure you are logged in and try again"
/// }
/// ```
#[
    openapi_path(
        get,
        path = "/api/auth/sessions/logout",
        tag = "Logout user",
        responses(
            (status = 200, description = "Logged out user", body = SuccessResponse,),
            (status = 400, description = "No valid session", body = ErrorResponse),
        )
    )
]
#[instrument(name="Log out user", skip(session))]
#[post("/logout")]
pub async fn logout(session: Session) -> HttpResponse {
    let session_manager = SessionManager {
        db_pool: None
    };

    match session_manager.logout(session).await {
        Ok(res) => {
            return HttpResponse::Ok().json(
                SuccessResponse {
                    message: res
                }
            )
        }
        Err(e) => {
            return HttpResponse::BadRequest().json(
                ErrorResponse {
                    error: e
                }
            )
        }
    };
}


/// Get current user
/// 
/// Retrieve the user details for the user logged in based on the session provided by 
/// the request.
/// 
/// # Example Usage:
/// ```shell
/// curl --request GET --url http://127.0.0.1:5000/api/auth/sessions/current-user
/// ```
/// 
/// # Example Response (Success):
/// ```json
/// {
/// 	"id": "99cd0418-f26d-4cc0-b035-071c8b20949b",
/// 	"email": "email@domain.com",
/// 	"name": "User's Name",
/// 	"is_active": true,
/// 	"is_staff": false,
/// 	"is_superuser": false,
/// 	"thumbnail": null,
/// 	"date_joined": "2023-12-26T11:44:03.237635Z",
/// 	"profile": {
/// 		"id": "85296af6-d07b-45ca-8d22-7ad5a19e3a76",
/// 		"user_id": "99cd0418-f26d-4cc0-b035-071c8b20949b",
/// 	}
/// }
/// ```
/// # Example Response (User Not Authenticated Error):
/// ```json
/// {
///	  "error": "You are not logged in. Kindly ensure you are logged in and try again"
/// }
/// ```
/// 
/// # Example Response (User Not Found Error):
/// ```json
/// {
///	  "error": "User was not found"
/// }
/// ```
#[
    openapi_path(
        get,
        path = "/api/auth/sessions/current-user",
        tag = "Get current user",
        responses(
            (status = 200, description = "Logged in user", body = UserVisible,),
            (status = 401, description = "User not logged in", body = ErrorResponse),
            (status = 404, description = "User not found", body = ErrorResponse),
        )
    )
]
#[instrument(name="Retrieving current user endpoint", skip(db_pool, session))]
#[get("/current-user")]
pub async fn get_current_user(db_pool: Data<PgPool>, session: Session) -> HttpResponse {
    let session_manager = SessionManager {
        db_pool: Some(db_pool)
    };

    match session_manager.get_current_user(&session).await {
        Ok(res) => {
            return HttpResponse::Ok().json(res)
        }
        Err(err) => {
            if err == "User was not found" {
                return HttpResponse::NotFound().json(
                    ErrorResponse {
                        error: err
                    }
                )
            } else {
                return HttpResponse::Unauthorized().json(
                    ErrorResponse {
                        error: err
                    }
                )
            }
        }
    }
}
