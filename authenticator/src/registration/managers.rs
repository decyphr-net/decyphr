use crate::email::managers::send_multipart_email;
use crate::registration::{
    entities::CreateUser, repositories::UserRegistrationRepository,
};
use crate::settings::get_settings;
use crate::tokens::{entities::RegistrationConfirmation, managers::TokenManager};
use actix_web::web::Data;
use deadpool_redis::Pool as RedisPool;
use infra::http::response::entities::{RedirectErrorResponse, RedirectSuccessResponse};
use tracing::{Level, event,};
use sqlx::postgres::PgPool;
use uuid::Uuid;


/// The authentication manager used by the `users` controllers to orchestrate the
/// process handling various user related logic
pub struct UserRegistrationManager {
    pub db_pool: Data<PgPool>,
    pub redis_pool: Option<Data<RedisPool>>,
    pub token_manager: Option<TokenManager>
}


impl UserRegistrationManager {

    /// Instrument the `token_manager` to create a new activation token
    async fn create_activation_token(
        &self, user_id: &Uuid, session_key: &str, ttl: i64, hmac: &str, secret_key: &str
    ) -> Result<String, String> {
        let token_manager = match &self.token_manager {
            Some(token_manager) => token_manager,
            None => return Err("Failed to get token_manager".to_string())
        };

        let issued_token = token_manager.issue_activation_token_pasetors(
            &user_id, &session_key, None, ttl, &hmac, &secret_key,
        );
        return Ok(issued_token)
    }

    /// Returns a response a success or error result based on whether of not the user
    /// creation process was successful or not.
    /// 
    /// Performs the following actions:
    /// 1. Hashes the user's password
    /// 2. Tells the repo to create the user
    /// 3. Sends the activation email to the user, with the activation token
    /// 
    /// # Arguments
    /// 
    /// * `new_user` - The user info that the controller received
    /// 
    /// # Examples
    /// 
    /// ```
    /// use crate::users::managers::UserAuthenticationManager;
    /// 
    /// ...
    /// 
    /// let manager = UserAuthenticationManager {
    ///     ...
    /// }
    /// 
    /// let user_creation_result = manager.create_new_user(...).await;
    /// match user_creation_result {
    ///     Ok(response) => {
    ///         return HttpResponse::Ok().json(response);
    ///     },
    ///     Err(e) => {
    ///         return HttpResponse::BadRequest().json(e);
    ///     }
    /// }
    /// ```
    pub async fn create_new_user(&self, new_user: CreateUser,) -> Result<Uuid, String> {
        let user_id = match UserRegistrationRepository::create_new_user(
            &self.db_pool, &new_user
        ).await {
            Ok(user_id) => user_id,
            Err(e) => return Err(e)
        };
        return Ok(user_id)
    }

    /// Set the activation token for the user in Redis
    pub async fn set_activation_token(
        &self, token: &str, session_key: &str, ttl: i64
    ) -> Result<(), String> {
        let redis_pool = match &self.redis_pool {
            Some(redis_pool) => redis_pool,
            None => return Err("Failed to get redis pool".to_string())
        };

        UserRegistrationRepository::set_activation_token(
            redis_pool, &token, &session_key, ttl
        ).await;

        return Ok(())
    }
    
    /// Regenerate a user's activation token by first checking to ensure that the
    /// email address provided is belong to a user that hasn't activated their account.
    /// If the user truly is inactive, re-set the token in Redis and resend the 
    /// activation email
    pub async fn regenerate_token(&self, email: &str) -> Result<String, String> {
        let token_manager = match &self.token_manager {
            Some(token_manager) => token_manager,
            None => return Err("We cannot activate you account at this time".to_string())
        };

        let user = match UserRegistrationRepository::get_inactive_user(
            &self.db_pool, &email
        ).await {
            Ok(user) => user,
            Err(e) => return Err(e)
        };

        let settings = get_settings().expect("Cannot load settings");
        let session_key: String = token_manager.create_token();
        let ttl: i64 = settings.secret.token_expiration;

        let token: String = match self.create_activation_token(
            &user.id, 
            &session_key, 
            ttl.clone(),
            &settings.secret.hmac_secret,
            &settings.secret.secret_key
        ).await {
            Ok(res) => res,
            Err(err) => return Err(err)
        };
        self.set_activation_token(&token, &session_key, ttl).await;

        // Send token to user
        send_multipart_email(
            "Decyphr - Let's get you verified".to_string(),
            user.id,
            user.email.clone(),
            user.name.clone(),
            "verification_email.html",
            &token,
        )
        .await
        .unwrap();

        // match self.set_activation_token
        return Ok("Account activation link has been sent successfully".to_string())
    }

    /// Returns a `Result` dictating whether or not the user activation was successful.
    /// A user's activation may fail for any of the following reasons:
    ///     1. infrastructure (failure to connect to redis)
    ///     2. issues verifying the token
    ///     3. invalid or expired token
    /// 
    /// The order in which these actions are performed:
    ///     1. Verify the user's activation token
    ///     2. Delete the token from redis so it can't be used again
    ///     3. Update the user record in the DB to activate the user
    /// 
    /// (TODO: Revise this order - the should only be removed from Redis once the user
    /// has successfully been activated)
    /// 
    /// # Arguments
    /// 
    /// `params` - The parameters provided by the request
    pub async fn confirm_registration(
        self, params: RegistrationConfirmation, 
    ) -> Result<RedirectSuccessResponse, RedirectErrorResponse> {
        let settings = get_settings().expect("Failed to read settings");

        let token_manager = match &self.token_manager {
            Some(token_manager) => token_manager,
            None => return Err(
                RedirectErrorResponse {
                    location: format!("{}/auth/error", settings.frontend_url),
                    error: "We cannot activate you account at this time".to_string()
                }
            )
        };

        let redis_pool = match &self.redis_pool {
            Some(redis_pool) => redis_pool,
            None => return Err(
                RedirectErrorResponse {
                    location: format!("{}/auth/error", settings.frontend_url),
                    error: "We cannot activate you account at this time".to_string()
                }
            )
        };

        let activation_token = match token_manager.verify_activation_token_pasetor(
            params.token.clone(), None
        ).await {
            Ok(token) => token,
            Err(_e) => return Err(
                RedirectErrorResponse {
                    location: format!(
                        "{}/auth/regenerate-token?reason=
                        It appears that your confirmation token has expired",
                        settings.frontend_url
                    ),
                    error: "".to_string()
                }
            )
        };

        match UserRegistrationRepository::delete_activation_token(
            redis_pool, &activation_token.session_key
        ).await {
            Ok(res) => res,
            Err(_e) => return Err(
                RedirectErrorResponse {
                    location: format!("{}/auth/error", settings.frontend_url),
                    error: "We cannot activate you account at this time".to_string()
                }
            )
        }

        match UserRegistrationRepository::activate_new_user(
            &self.db_pool, activation_token.user_id
        ).await {
            Ok(_) => {
                event!(
                    target: "authenticator", 
                    Level::INFO, 
                    "New user activated successfully"
                );

                return Ok(
                    RedirectSuccessResponse {
                        location: format!("{}/auth/confirmed", settings.frontend_url),
                        message: 
                            "Your account has been activated successully!".to_string()
                    }
                )
            }
            Err(e) => {
                event!(
                    target: "authenticator", 
                    Level::ERROR, 
                    "Cannot activate account: {}", 
                    e
                );
                return Err(
                    RedirectErrorResponse {
                        location: 
                            format!("{}/auth/error?reason={e}", settings.frontend_url),
                        error: "".to_string()
                    }
                )
            }
        };
    }
}
