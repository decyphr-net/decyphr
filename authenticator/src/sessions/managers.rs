use crate::registration::utils::password::verify_password;
use crate::sessions::{
    constants::{USER_EMAIL_KEY, USER_ID_KEY},
    entities::{LoginUser, UserProfile, UserVisible},
    repositories::SessionRepository,
};
use actix_session::Session;
use actix_web::web::{Data, Json};
use sqlx::postgres::PgPool;
use tokio::task::spawn_blocking;
use tracing::{Level, event,};
use uuid::Uuid;


pub struct SessionManager {
    pub db_pool: Option<Data<PgPool>>
}


impl SessionManager {

    pub fn create_session(&self, session: &Session, user_id: &Uuid, email: &str) {
        session.renew();
        session
            .insert(USER_ID_KEY, &user_id)
            .expect("`user_id` cannot be inserted into session");

        session
            .insert(USER_EMAIL_KEY, &email)
            .expect("`user_email` cannot be inserted into session");
    }

    pub fn get_user_session_id(&self, session: &Session) -> Result<Uuid, String> {
        match session.get(USER_ID_KEY) {
            Ok(user_id) => match user_id {
                None => Err("You are not authenticated".to_string()),
                Some(id) => Ok(id)
            },
            Err(e) => Err(format!("{e}"))
        }
    }

    pub async fn login(
        &self, user: Json<LoginUser>, session: Session
    ) -> Result<UserVisible, String> {

        let db_pool = match &self.db_pool {
            Some(pool) => pool,
            None => return Err("Failed to get DB pool".to_string())
        };
        
        match SessionRepository::get_active_user(
            db_pool, None, Some(&user.email)
        ).await {
            Ok(loggedin_user) => match spawn_blocking(
                move || {
                    verify_password(
                        loggedin_user.password.as_ref(), user.password.as_bytes()
                    )
                }
            )
            .await
            .expect("Unable to unwrap JoinError")
            {
                Ok(_) => {
                    let _ = &self.create_session(
                        &session, &loggedin_user.id, &loggedin_user.email
                    );

                    event!(
                        target: "authenticator", 
                        Level::INFO, 
                        "User logged in successfully"
                    );

                    return Ok(
                        UserVisible {
                            id: loggedin_user.id,
                            email: loggedin_user.email,
                            name: loggedin_user.name,
                            is_active: loggedin_user.is_active,
                            is_staff: loggedin_user.is_staff,
                            is_superuser: loggedin_user.is_superuser,
                            thumbnail: loggedin_user.thumbnail,
                            date_joined: loggedin_user.date_joined,
                            profile: UserProfile {
                                id: loggedin_user.profile.id,
                                user_id: loggedin_user.profile.user_id,
                            },
                        }
                    )
                }
                Err(e) => {
                    event!(
                        target: "argon2", 
                        Level::ERROR, 
                        "Failed to authenicate user: {:#?}", 
                        e
                    );
                    return Err(
                        "Email and password do not match".to_string()
                    )
                }
            }
            Err(e) => {
                event!(target: "sqlx", Level::ERROR, "User not found: {:#?}", e);
                return Err(
                    "A user with these details does not exist. If you registered with 
                    these details, ensure you activate your account by clicking on 
                    the link sent to your e-mail address"
                    .to_string(),
                )
            }
        };
    }

    pub async fn logout(&self, session: Session) -> Result<String, String> {
        match &self.get_user_session_id(&session) {
            Ok(_) => {
                event!(target: "authenticator", Level::INFO, "User session retrieved");
                session.purge();
                return Ok("You have successfully logged out".to_string())
            }
            Err(e) => {
                event!(
                    target: "authenticator", 
                    Level::ERROR, 
                    "Failed to get user from session: {:#?}",
                    e
                );
                return Err(
                    "We are experiencing some issues. Please ensure you are logged in and try again".to_string()
                )
            }
        }
    }

    pub async fn get_current_user(
        &self, session: &Session
    ) -> Result<UserVisible, String> {
        let db_pool = match &self.db_pool {
            Some(pool) => pool,
            None => return Err("Failed to get DB pool".to_string())
        };

        match &self.get_user_session_id(&session) {
            Ok(id) => {
                match SessionRepository::get_active_user(
                    db_pool, Some(id), None
                ).await {
                    Ok(user) => {
                        event!(
                            target: "authenticator",
                            Level::INFO, 
                            "User retrieved from the DB."
                        );
                        return Ok(
                            UserVisible {
                                id: user.id,
                                email: user.email,
                                name: user.name,
                                is_active: user.is_active,
                                is_staff: user.is_staff,
                                is_superuser: user.is_superuser,
                                date_joined: user.date_joined,
                                thumbnail: user.thumbnail,
                                profile: UserProfile {
                                    id: user.profile.id,
                                    user_id: user.profile.user_id,
                                },
                            }
                        )
                    }
                    Err(e) => {
                        event!(
                            target: "authenticator", 
                            Level::ERROR, 
                            "User cannot be retrieved from the DB: {:#?}", 
                            e
                        );
                        return Err("User was not found".to_string())
                    }
                };
            }
            Err(e) => {
                event!(
                    target: "session",
                    Level::ERROR, 
                    "Failed to get user from session. User unauthorized: {}", 
                    e
                );
                return Err(
                    "You are not logged in. Kindly ensure you are logged in and try again"
                    .to_string()
                )
            }
        }
    }
}
