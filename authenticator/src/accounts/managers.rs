use crate::{
    accounts::{
        entities::{Thumbnail, UpdateUser, UserToUpdate}, 
        forms::UserForm,
        repositories::AccountsRepository
    },
    sessions::{
        entities::{User, UserProfile, UserVisible},
        managers::SessionManager,
        repositories::SessionRepository,
    },
};

use actix_multipart::form::MultipartForm;
use actix_session::Session;
use actix_web::web::Data;
use infra::third_party::aws::s3::client::S3Client;
use sqlx::postgres::PgPool;
use tracing::{Level, event,};
use uuid::Uuid;


pub struct AccountsManager {
    pub db_pool: Data<PgPool>
}


/// The manager that should be used for performing an update actions on a user's account.
/// The `update_user` method is the method that should be used by any consumer that
/// wishes to update a user's account details
impl AccountsManager {
    /// Used to ensure that the user has an activated account based on either a user's
    /// ID or their email address.
    pub async fn get_active_user(
        &self, user_id: Option<&Uuid>, user_email: Option<&String>
    ) -> Result<User, String> {
        // TODO: `sessions` should probably rely on `accounts` rather than `accounts`
        // relying on `sessions`. Update this so that `SessionManager` get the active
        // user from `AccountsManager`
        return SessionRepository::get_active_user(
            &self.db_pool, user_id, user_email
        ).await;
    } 

    /// Delete a thumbnail image from S3 based on the provided thumbail path. The user
    /// ID is provided in the event that the deletion fails to know which user failed
    async fn delete_thumbnail(
        &self, thumbnail: Thumbnail, s3_client: &S3Client, id: &Uuid
    ) {
        if let Some(url) = thumbnail.thumbnail {
            let s3_image_key = &url[url.find("media").unwrap_or(url.len())..];

            if !s3_client.delete_file(s3_image_key).await {
                event!(
                    target: "authenticator",
                    Level::INFO,
                    "We could not delete current thumbnail of user with ID: {}",
                    &id
                );
            }
        }
    }

    /// Responsible for combining all of the provided user information that needs to be
    /// updated and pushed to the DB and handles the building of the structure that will
    /// be send to the repository to be inserted into the DB.
    /// 
    /// As part of this process, if the user intends to update their thumbnail, the 
    /// path to the existing thumbnail will need to be retrieved from the DB so that
    /// it can be deleted from S3 and replaced with the new image.
    /// 
    /// Any other areas of the application that needs to update a user's account details,
    /// for example, resetting a user's password should be done through this method.
    /// In order to achieve this, a `UserToUpdate` structure should be provided,
    /// containing only the details that are intended to be updated. All others should
    /// be `None`
    pub async fn update_user(
        &self, user_id: &Uuid, user_to_update: UserToUpdate, s3_client: &S3Client
    ) -> Result<UserVisible, String> {
        let mut new_user_data = UpdateUser {
            email: user_to_update.email.to_owned(),
            name: user_to_update.name.to_owned(),
            password: user_to_update.password.to_owned(),
            is_active: user_to_update.is_active.to_owned(),
            is_staff: user_to_update.is_staff.to_owned(),
            is_superuser: user_to_update.is_superuser.to_owned(),
            thumbnail: None,
        };

        // If the user is trying to update their thumbnail then the existing one needs
        // to be deleted from s3, and replaced with the new one
        if user_to_update.thumbnail.is_some() {
            let thumbnail = match AccountsRepository::get_current_thumbnail(
                &self.db_pool, &user_id
            ).await {
                Ok(res) => res,
                Err(e) => return Err(e)
            };

            &self.delete_thumbnail(thumbnail.clone(), s3_client, &user_id).await;

            let s3_key_prefix = format!("media/user-avatars/{user_id}/");
            let uploaded_file = s3_client.upload(
                &user_to_update.thumbnail.as_ref().unwrap(), &s3_key_prefix
            ).await;

            new_user_data.thumbnail = Some(uploaded_file.s3_url);
        };

        match AccountsRepository::update_user(
            &self.db_pool, new_user_data, user_id
        ).await {
            Ok(_) => {
                match &self.get_active_user(Some(user_id), None).await {
                    Ok(user) => return Ok(
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
                        }
                    ),
                    Err(e) => return Err(e.to_string())
                };
            },
            Err(e) => return Err(e)
        };
    }

    /// The interface that the controller will call in order to update the user's
    /// details via the update account details page. This method will check to ensure
    /// that the user requesting the change has an active session and will return a
    /// an error if they are not logged in, otherwise it will build a structure 
    /// containing the data needed to update the user's account details.
    /// 
    /// The reason for calling this method before calling `update_user` is to preprocess
    /// the data so that fits the shape required by the `update_user` API
    pub async fn update_users_account(
        &self, form: MultipartForm<UserForm>, session: &Session, s3_client: &S3Client
    ) -> Result<(), String> {

        let session_manager = SessionManager {
            db_pool: Some(self.db_pool.clone())
        };

        let user_id = match session_manager.get_user_session_id(&session) {
            Ok(id) => id,
            Err(e) => {
                event!(
                    target: "session", 
                    Level::ERROR,
                    "Failed to get user from session. User unauthorized: {}",
                    e
                );
                return Err(
                    "You are not logged in. Ensure you are logged in and try again"
                    .to_string()
                )
            }
        };

        let mut user_to_update = UserToUpdate {
            email: None,
            name: None,
            password: None,
            is_active: None,
            is_staff: None,
            is_superuser: None,
            thumbnail: form.0.thumbnail,
        };

        if let Some(name) = form.0.name {
            user_to_update.name = Some(name.0);
        };

        match &self.update_user(&user_id, user_to_update, &s3_client).await {
            Ok(_) => return Ok(()),
            Err(e) => return Err(e.to_string())
        };
    }
}