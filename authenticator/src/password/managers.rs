use crate::accounts::{entities::UserToUpdate, managers::AccountsManager};
use crate::email::managers::send_multipart_email;
use crate::password::{
    entities::{ConfirmPasswordChangeParams, NewPassword},
    repositories::PasswordRepository
};
use crate::registration::entities::UserEmail;
use crate::settings::get_settings;
use crate::tokens::managers::TokenManager;
use actix_web::web::{Json, Data};
use argon2::{
    password_hash::{
        Error as ArgonError,
        rand_core::OsRng, 
        PasswordHash, 
        PasswordHasher,
        PasswordVerifier,
        SaltString
    },
    Argon2,
};
use deadpool_redis::Pool as RedisPool;
use infra::{
    http::response::entities::{
        ErrorResponse, RedirectErrorResponse, RedirectSuccessResponse, SuccessResponse,
    },
    third_party::aws::s3::client::S3Client
};
use sqlx::postgres::PgPool;
use tracing::{Level, event,};
use uuid::Uuid;


pub struct PasswordManager {
    pub db_pool: Data<PgPool>,
    pub redis_pool: Data<RedisPool>,
}


impl PasswordManager {
    pub async fn handle_password_change_request(
        &self, user_email: Json<UserEmail>
    ) -> Result<String, String> {
        let settings = get_settings().expect("Failed to get settings");

        let accounts_manager = AccountsManager {
            db_pool: self.db_pool.to_owned()
        };

        let user = match accounts_manager.get_active_user(
            None, Some(&user_email.email)
        ).await {
            Ok(user) => user,
            Err(err) => {
                event!(target: "sqlx", Level::ERROR, "User not found:{:#?}", err);
                return Err(
                    format!(
                        "An active user with this e-mail address does not exist. If you 
                        registered with this email, ensure you have activated your 
                        account. You can check by logging in. If you have not activated 
                        it, visit {}/auth/regenerate-token to regenerate the token that 
                        will allow you activate your account.", 
                        settings.frontend_url
                    )
                )
            }
        };
        let token_manager = TokenManager { };

        let session_key: String = token_manager.create_token();
        let ttl: i64 = settings.secret.token_expiration;

        let token: String = match self.create_password_change_request_token(
            &user.id, 
            &session_key, 
            ttl.clone(),
            &settings.secret.hmac_secret,
            &settings.secret.secret_key
        ).await {
            Ok(res) => res,
            Err(err) => return Err(err)
        };
        self.set_password_change_request_token(&token, &session_key, ttl).await;
        // Send token to user
        send_multipart_email(
            "Decyphr - Password Reset Instructions".to_string(),
            user.id,
            user.email.clone(),
            user.name.clone(),
            "password_reset_email.html",
            &token,
        )
        .await
        .unwrap();
        return Ok(
            "Password reset instructions have been sent to your email address. Kindly 
            take action before its expiration".to_string()
        )
    }

    async fn create_password_change_request_token(
        &self, user_id: &Uuid, session_key: &str, ttl: i64, hmac: &str, secret_key: &str
    ) -> Result<String, String> {
        let token_manager = TokenManager { };

        let issued_token = token_manager.issue_activation_token_pasetors(
            &user_id, &session_key, None, ttl, &hmac, &secret_key,
        );
        return Ok(issued_token)
    }

    /// Set the activation token for the user in Redis
    pub async fn set_password_change_request_token(
        &self, token: &str, session_key: &str, ttl: i64
    ) -> Result<(), String> {
        PasswordRepository::set_request_password_change_token(
            &self.redis_pool, &token, &session_key, ttl
        ).await;

        return Ok(())
    }

    pub async fn confirm_password_change_token(
        &self, params: ConfirmPasswordChangeParams
    ) -> Result<RedirectSuccessResponse, RedirectErrorResponse> {
        let settings = get_settings().expect("Failed to read settings");

        let token_manager = TokenManager { };

        let session_key: String = token_manager.create_token();
        let ttl: i64 = settings.secret.token_expiration;

        let activation_token = match token_manager.verify_activation_token_pasetor(
            params.token.clone(), None
        ).await {
            Ok(token) => token,
            Err(_e) => return Err(
                RedirectErrorResponse {
                    location: format!(
                        "{}/auth/error?reason=
                        It appears that your password request token has expired",
                        settings.frontend_url
                    ),
                    error: "".to_string()
                }
            )
        };

        let token: String = match self.create_password_change_request_token(
            &activation_token.user_id, 
            &session_key, 
            ttl.clone(),
            &settings.secret.hmac_secret,
            &settings.secret.secret_key
        ).await {
            Ok(res) => res,
            Err(_) => return Err(
                RedirectErrorResponse {
                    location: format!("{}/auth/error", &settings.frontend_url),
                    error: "We cannot update your password at this time".to_string()
                }
                
            )
        };
        self.set_password_change_request_token(&token, &session_key, ttl).await;

        return Ok(
            RedirectSuccessResponse {
                location: format!(
                    "{}/auth/password/change-password?token={}", 
                    settings.frontend_url, 
                    &token
                ),
                message: "Success!".to_string(),
            }
        );
    }

    pub async fn update_user_password(
        &self, new_password: NewPassword, s3_client: Data<S3Client>
    ) -> Result<SuccessResponse, ErrorResponse> {
        let token_manager = TokenManager { };

        let user_id = match token_manager.verify_activation_token_pasetor(
            new_password.token.clone(), None
        ).await {
            Ok(token) => token.user_id,
            Err(_e) => return Err(
                ErrorResponse {
                    error: 
                        "It appears that your password request token has expired"
                        .to_string()
                }
            )
        };

        let new_user_password = &self.create_password(new_password.password).await;

        let user_to_update = UserToUpdate {
            email: None,
            name: None,
            password: Some(new_user_password.to_string()),
            is_active: None,
            is_staff: None,
            is_superuser: None,
            thumbnail: None,
        };

        let account_manager = AccountsManager {
            db_pool: self.db_pool.to_owned(),
        };

        match account_manager.update_user(&user_id, user_to_update, &s3_client).await {
            Ok(_) => return Ok(
                SuccessResponse {
                    message: "Password successfully updated!".to_string(),
                }
            ),
            Err(_) => return Err(
                ErrorResponse {
                    error: "Unable to update your password at this time".to_string()
                }
            )
        }
    }

    pub async fn create_password(&self, password_in_plain_text: String) -> String {
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(password_in_plain_text.as_bytes(), &salt)
            .expect("Unable to hash password.")
            .to_string()
    }

    pub fn verify_password(hash: &str, password: &[u8]) -> Result<(), ArgonError> {
        let parsed_hash = PasswordHash::new(hash)?;
        Argon2::default().verify_password(password, &parsed_hash)
    }
}