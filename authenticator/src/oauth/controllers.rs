use crate::oauth::{
    managers::OAuthManager,
    entities::{LoginUserScema, QueryCode, RegisterUserSchema, TokenClaims, NewUser},  
};
use crate::sessions::{entities::UserVisible, managers::SessionManager};
use crate::settings::get_settings;

use actix_session::Session;
use actix_web::{
    cookie::{time::Duration as ActixWebDuration, Cookie},
    get, 
    post, 
    web::{Data, Query}, 
    HttpResponse,
    http::header::LOCATION
};
use chrono::{prelude::*, Duration as ChronoDuration, Utc};
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use jsonwebtoken::{encode, EncodingKey, Header};
use reqwest::header::LOCATION as REQWEST_LOCATION;
use sqlx::{
    Row,
    query,
    postgres::{PgPool, PgRow},
};
use uuid::Uuid;
use tracing::{event, instrument, Level};


/// TODO: 
///     1. Update this follow the usual pattern (controller/manager/repository)
///     2. A stategy level may also be required so that the strategy can inform the
///         manager of which actions need to be taken in order to make this code more 
///         reusable
///     3. Instead of creating a token at the end of this process, it should create a
///         new session to fit with the existing approach 
#[get("/oauth/google")]
pub async fn register_user(
    query_code: Query<QueryCode>, db_pool: Data<PgPool>, session: Session
) -> HttpResponse {
    let code = &query_code.code;
    let state = &query_code.state;

    if code.is_empty() {
        return HttpResponse::Unauthorized().json(
            ErrorResponse {
                error: "Authorization code not provided!".to_string()
            }
        )
    }

    let manager = OAuthManager {
        db_pool: db_pool
    };

    match manager.perform_google_auth(code.as_str(), session).await {
        Ok(_) => {
            let settings = get_settings().expect("Failed to read settings");
            let frontend_origin = settings.frontend_url.to_owned();
            let mut response = HttpResponse::Found();
            response.append_header((LOCATION, format!("{}{}", frontend_origin, state)));
            return response.finish()
        }
        Err(e) => {
            let error = ErrorResponse {
                error: e
            };
            if error.error == "Something unexpected happend. Kindly try again.".to_string() {
                return HttpResponse::InternalServerError().json(error)
            } else {
                return HttpResponse::BadGateway().json(error);
            }
        }
    };
    
    // // TODO: Fix this to use proper pool and User struct
    // let user: Option<NewUser> = match query("SELECT id, name, email, password, is_active, is_staff, is_superuser, date_joined FROM users WHERE email = $1")
    //     .bind(&email)
    //     .map(
    //         |row: PgRow| NewUser {
    //             id: row.get("id"),
    //             name: row.get("name"),
    //             is_active: row.get("is_active"),
    //             email: row.get("email"),
    //             is_superuser: row.get("is_superuser"),
    //             is_staff: row.get("is_staff"),
    //             password: row.get("password"),
    //             // thumbnail: row.get("thumbnail"),
    //             date_joined: row.get("date_joined"),
    //         }
    //     )
    //     .fetch_one(&mut transaction)
    //     .await {
    //         Ok(user) => Some(user),
    //         Err(_e) => None
    //     };

    // let user_id: Uuid;

    // // 2. If user exists, update user with new data from Google
    // if user.is_some() {
    //     let mut user = user.unwrap();
    //     user_id = user.id.to_owned();
    //     user.email = email.to_owned();
    //     // user.thumbnail = google_user.picture;

    //     let session_manager = SessionManager {
    //         db_pool: Some(db_pool)
    //     };

    //     session_manager.create_session(&session, &user_id, &user.email);
    // } else {
    //     let datetime = Utc::now();
    //     let id = Uuid::new_v4();
    //     user_id = id.to_owned();
    //     let user_data = NewUser {
    //         id: id,
    //         name: google_user.name,
    //         is_active: google_user.verified_email,
    //         email,
    //         is_superuser: false,
    //         is_staff: false,
    //         password: "".to_string(),
    //         // thumbnail: google_user.picture,
    //         date_joined: datetime,
    //     };

    //     // TODO: Insert user into DB
    // };

}