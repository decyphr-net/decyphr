use crate::password::{
    entities::{ConfirmPasswordChangeParams, NewPassword}, managers::PasswordManager
};
use crate::registration::entities::UserEmail;
use actix_web::{
    web::{Json, Data, Query}, HttpResponse, get, post, http::header::LOCATION
};
use deadpool_redis::Pool as RedisPool;
use infra::{
    http::response::entities::{ErrorResponse, SuccessResponse},
    third_party::aws::s3::client::S3Client
};
use sqlx::postgres::PgPool;
use tracing::instrument;


#[instrument(name="Requesting a password change", skip(redis_pool))]
#[post("/request-password-change")]
pub async fn request_password_change(
    db_pool: Data<PgPool>, user_email: Json<UserEmail>, redis_pool: Data<RedisPool>
) -> HttpResponse {
    let manager = PasswordManager {
        db_pool: db_pool,
        redis_pool: redis_pool,
    };

    match manager.handle_password_change_request(user_email).await {
        Ok(res) => {
            return HttpResponse::Ok().json(
                SuccessResponse {
                    message: res
                }
            );
        }
        Err(err) => {
            
            HttpResponse::NotFound().json(
                ErrorResponse {
                    error: err,
                }
            )
        }
    }
}


#[instrument("Confirming change password token", skip(params, redis_pool))]
#[get("/confirm-change-password")]
pub async fn confirm_change_password_token(
    Query(params): Query<ConfirmPasswordChangeParams>,
    db_pool: Data<PgPool>,
    redis_pool: Data<RedisPool>,
) -> HttpResponse {
    let manager = PasswordManager {
        db_pool: db_pool,
        redis_pool: redis_pool.clone(),
    };

    match manager.confirm_password_change_token(params).await {
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


#[instrument(name="Changing user's password", skip(db_pool, new_password, redis_pool))]
#[post("/change-user-password")]
pub async fn change_user_password(
    Json(new_password): Json<NewPassword>,
    db_pool: Data<PgPool>,
    redis_pool: Data<RedisPool>,
    s3_client: Data<S3Client>
) -> HttpResponse {
    let manager = PasswordManager {
        db_pool: db_pool,
        redis_pool: redis_pool.clone(),
    };

    match manager.update_user_password(new_password, s3_client).await {
        Ok(res) => return HttpResponse::Ok().json(res),
        Err(err) => {
            if err.error != "It appears that your password request token has expired".to_string() {
                return HttpResponse::InternalServerError().json(err.error);
            } else {
                return HttpResponse::BadRequest().json(err.error);
            }
        }
    }
}