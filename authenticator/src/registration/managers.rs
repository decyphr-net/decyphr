// use crate::settings::get_settings;
// use crate::types::{
//     ErrorResponse, SuccessResponse, USER_ID_KEY, USER_EMAIL_KEY
// };
// use crate::users::{
//     entities::{
//         general::{
//             CreateUser,
//             ConfirmRegistrationErrorResponse,
//             ConfirmRegistrationSuccessResponse,
//             Thumbnail, 
//             UpdateUser, 
//             UpdateUserProfile,
//             UserProfile,
//             UserVisible
//         },
//         request_bodies::{
//             LoginUser,
//             RegisteringUser,
//             TokenParams
//         }
//     },
//     forms::{UserForm},
//     repositories::{UserAuthenticationRepository},
//     utils::{
//         email::{send_multipart_email},
//         password::{hash, verify_password},
//         tokens::{verify_confirmation_token_pasetor}
//     }
// };
use crate::registration::{
    entities::{
        ConfirmRegistrationErrorResponse,
        ConfirmRegistrationSuccessResponse,
        CreateUser, 
        NewUser
    },
    repositories::UserRegistrationRepository,
    utils::{email::send_multipart_email, password::hash}
};
use crate::settings::get_settings;
use crate::tokens::{
    entities::RegistrationConfirmation,
    managers::{issue_confirmation_token_pasetors, verify_confirmation_token_pasetor}
};

use actix_multipart::form::MultipartForm;
use actix_session::Session;
use actix_web::{
    web::{Json, Data, Query},
};
use deadpool_redis::Pool as RedisPool;
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use tracing::{Level, event,};
use sqlx::{postgres::{PgPool},};
use tokio::task::spawn_blocking;
use uuid::Uuid;

/// The authentication manager used by the `users` controllers to orchestrate the
/// process handling various user related logic
pub struct UserRegistrationManager {
    pub db_pool: Option<Data<PgPool>>,
    pub redis_pool: Option<Data<RedisPool>>,
}

impl UserRegistrationManager {

    /// Retrieve the user's ID from the session. This may fail for the following
    /// reasons:
    /// 1. User has hit an endpoint while not logged in
    /// 2. Some other reason
    /// 
    /// # Returns
    /// Uuid (user's ID)
    /// String (error message)
    // async fn get_user_session_id(self, session: &Session) -> Result<Uuid, String> {
    //     match session.get(USER_ID_KEY) {
    //         Ok(user_id) => match user_id {
    //             None => Err("You are not authenticated".to_string()),
    //             Some(id) => Ok(id)
    //         },
    //         Err(e) => Err(format!("{e}")),
    //     }
    // }

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
    ///         return HttpResponse::BadRequest()::json(e);
    ///     }
    /// }
    /// ```
    pub async fn create_new_user(
        self, new_user: NewUser
    ) -> Result<SuccessResponse, ErrorResponse> {
        let hashed_password = hash(&new_user.password.as_bytes()).await;

        // Create a new user instance with the hashed password
        let create_new_user = CreateUser {
            password: hashed_password,
            email: new_user.email, 
            name: new_user.name
        };

        let create_new_user_result = UserRegistrationRepository::create_new_user(
            &self.db_pool.unwrap(), &create_new_user
        ).await;

        let user_id = match create_new_user_result {
            Ok(id) => id,
            Err(e) => {
                event!(target: "sqlx", Level::ERROR, "Failed to insert user: {:#?}", e);
                let error_message = if e
                    .as_database_error()
                    .unwrap()
                    .code()
                    .unwrap()
                    .parse::<i32>()
                    .unwrap()
                    == 23505 
                {
                    ErrorResponse {
                        error: 
                            "A user with that email address already exists".to_string()
                    }
                } else {
                    ErrorResponse {
                        error: "Error inserting user into DB".to_string(),
                    }
                };
                return Err(error_message);
            }
        };

        let mut redis_con = self.redis_pool.expect("")
            .get()
            .await
            .map_err(
                |e| {
                    event!(target: "authenticator", Level::ERROR, "{}", e);
                    return ErrorResponse {
                        error:
                            "We cannot activate your account at the moment".to_string()
                    }
                }
            )
            .expect("Redis connection cannot be retrieved");

        let issued_token = match issue_confirmation_token_pasetors(
            user_id, &mut redis_con, None,
        )
        .await
        {
            Ok(t) => t,
            Err(e) => {
                event!(target: "authenticator", Level::ERROR, "{}", e);
                return Err(
                    ErrorResponse {
                        error: format!("{}", e)
                    }
                );
            }
        };

        send_multipart_email(
            "Decyphr - Let's get you verified".to_string(),
            user_id,
            create_new_user.email,
            create_new_user.name,
            "verification_email.html",
            issued_token,
        )
        .await
        .unwrap();

        // Everything has gone well. Return success response
        return Ok(
            SuccessResponse {
                message: 
                    "Your account has been created successfully! We have sent you an 
                    activation email for you to activate your account"
                    .to_string()
            }
        )
    }

    /// Returns a `Result` dictating whether or not the user activation was successful.
    /// A user's activation may fail for any of the following reasons:
    ///     1. infrastructure (failure to connect to redis)
    ///     2. issues verifying the token
    ///     3. invalid or expired token
    /// 
    /// # Arguments
    /// 
    /// `params` - The parameters provided by the request
    pub async fn confirm_registration(
        self, params: RegistrationConfirmation, 
    ) -> Result<ConfirmRegistrationSuccessResponse, ConfirmRegistrationErrorResponse> {
        let settings = get_settings().expect("Failed to read settings");

        let mut redis_con = self.redis_pool.unwrap()
            .get()
            .await
            .map_err(
                |e| {
                    event!(target: "authenticator", Level::ERROR, "{}", e);
                    ConfirmRegistrationErrorResponse {
                        location: format!("{}/auth/error", settings.frontend_url),
                        error: "We cannot activate you account at this time".to_string()
                    }
                }
            )
            .expect("Redis connection cannot be retreived");

        let confirmation_token_result = verify_confirmation_token_pasetor(
            params.token.clone(), &mut redis_con, None
        ).await;

        let confirmation_token = match confirmation_token_result {
            Ok(token) => token,
            Err(e) => {
                event!(target: "authenticator", Level::ERROR, "{:#?}", e);
                return Err(
                    ConfirmRegistrationErrorResponse {
                        location: format!(
                            "{}/auth/regenerate-token?reason=
                            It appears that your confirmation token has expired",
                            settings.frontend_url
                        ),
                        error: "".to_string()
                    }
                )
            }
        };

        match UserRegistrationRepository::activate_new_user(
            &self.db_pool.unwrap(), confirmation_token.user_id
        ).await {
            Ok(_) => {
                event!(
                    target: "authenticator", 
                    Level::INFO, 
                    "New user activated successfully"
                );

                return Ok(
                    ConfirmRegistrationSuccessResponse {
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
                    ConfirmRegistrationErrorResponse {
                        location: 
                            format!("{}/auth/error?reason={e}", settings.frontend_url),
                        error: "".to_string()
                    }
                )
            }
        };
    }
}
