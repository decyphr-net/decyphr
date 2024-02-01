use crate::accounts::{entities::UserToUpdate, managers::AccountsManager};
use crate::oauth::entities::{GoogleUserResult, OAuthResponse};
use crate::registration::{entities::CreateUser, managers::UserRegistrationManager};
use crate::sessions::{
    constants::{USER_EMAIL_KEY, USER_ID_KEY},
    entities::{LoginUser, UserProfile, UserVisible},
    managers::SessionManager,
};
use crate::settings::get_settings;

use actix_session::Session;
use actix_web::web::{Data, Json};
use reqwest::{Client as ReqwestClient, Url};
use sqlx::postgres::PgPool;
use std::error::Error as GeneralError;
use tokio::task::spawn_blocking;
use tracing::{Level, event,};
use uuid::Uuid;


pub struct OAuthManager {
    pub db_pool: Data<PgPool>,
}


impl OAuthManager {
    async fn request_token(
        &self, auth_code: &str
    ) -> Result<OAuthResponse, Box<dyn GeneralError>> {
        let settings = get_settings().expect("Failed to read settings");
    
        let root_url = "https://oauth2.googleapis.com/token";
        let client = ReqwestClient::new();

        let params = [
            ("grant_type", "authorization_code"),
            ("redirect_uri", settings.google_oauth.redirect_uri.as_str()),
            ("client_id", settings.google_oauth.client_id.as_str()),
            ("code", &auth_code),
            ("client_secret", settings.google_oauth.client_secret.as_str()),
            ("access_type", "offline")
        ];
        let response = client.post(root_url).form(&params).send().await?;

        if response.status().is_success() {
            let oauth_response = response.json::<OAuthResponse>().await?;
            Ok(oauth_response)
        } else {
            Err(From::from(format!("{:?}", response.text().await?)))
        }
    }

    async fn get_google_user(
        &self, access_token: &str, id_token: &str
    ) -> Result<GoogleUserResult, Box<dyn GeneralError>> {
        let client = ReqwestClient::new();
        let mut url = Url::parse("https://www.googleapis.com/oauth2/v1/userinfo").unwrap();

        url.query_pairs_mut().append_pair("alt", "json");
        url.query_pairs_mut().append_pair("access_token", access_token);

        let response = client.get(url).bearer_auth(id_token).send().await?;

        if response.status().is_success() {
            let user_info = response.json::<GoogleUserResult>().await?;
            Ok(user_info)
        } else {
            let message = "An error occurred while trying to retrieve user information.";
            Err(From::from(message))
        }
    }

    pub async fn perform_google_auth(
        &self, auth_code: &str, session: Session
    ) -> Result<String, String> {
        let token_response = &self.request_token(auth_code).await;

        if token_response.is_err() {
            event!(target: "authenticator", Level::ERROR, "{:?}", token_response);
            return Err(token_response.as_ref().err().unwrap().to_string());
        }

        let token_response = token_response.as_ref().unwrap();
        let google_user = &self.get_google_user(
            &token_response.access_token, &token_response.id_token
        ).await;

        if google_user.is_err() {
            return Err(google_user.as_ref().err().unwrap().to_string());
        }

        let google_user = google_user.as_ref().unwrap();
        let email = google_user.email.to_lowercase();

        let accounts_manager = AccountsManager {
            db_pool: self.db_pool.to_owned()
        };
        
        // Get user based on their email using a new AccountsManager
        let user = match accounts_manager.get_active_user(None, Some(&email)).await {
            Ok(user) => Some(
                UserVisible {
                    id: user.id,
                    email: user.email.to_owned(),
                    name: user.name.to_owned(),
                    is_active: user.is_active,
                    is_staff: user.is_staff,
                    is_superuser: user.is_superuser,
                    date_joined: user.date_joined,
                    thumbnail: user.thumbnail.to_owned(),
                    profile: UserProfile {
                        id: user.profile.id,
                        user_id: user.profile.user_id,
                    },
                },
            ),
            Err(_) => None
        };

        let session_manager = SessionManager {
            db_pool: Some(self.db_pool.to_owned())
        };

        if user.is_some() {
            let user = user.unwrap();    
            session_manager.create_session(&session, &user.id, &user.email);
            return Ok("Logged in successfully".to_string());
        } else {
            let new_user = CreateUser {
                email: google_user.email.to_owned(),
                password: "".to_string(),
                name: "".to_string(),
            };

            let registration_manager = UserRegistrationManager {
                db_pool: self.db_pool.to_owned(),
                redis_pool: None,
                token_manager: None
            };

            let user = match registration_manager.create_new_user(new_user.clone()).await {
                Ok(_) => {
                    match accounts_manager.get_active_user(
                        None, Some(&new_user.email.to_owned())
                    ).await {
                        Ok(user) => Some(
                            UserVisible {
                                id: user.id,
                                email: user.email.to_owned(),
                                name: user.name.to_owned(),
                                is_active: user.is_active,
                                is_staff: user.is_staff,
                                is_superuser: user.is_superuser,
                                date_joined: user.date_joined,
                                thumbnail: user.thumbnail.to_owned(),
                                profile: UserProfile {
                                    id: user.profile.id,
                                    user_id: user.profile.user_id,
                                },
                            },
                        ),
                        Err(_) => None
                    };
                    if user.is_some() {
                        let user = user.unwrap();    
                        session_manager.create_session(&session, &user.id, &user.email);
                        return Ok("New user created".to_string());
                    }   else { 
                        return Err("Error creating user".to_string())
                    }                  
                }
                Err(err) => return Err(err)
            };
            
        }
    }
}
