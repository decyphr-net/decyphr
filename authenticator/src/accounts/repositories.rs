use crate::accounts::{db::AccountsDb, entities::{Thumbnail, UpdateUser}};

use actix_web::web::Data;
use sqlx::postgres::PgPool;
use uuid::Uuid;


pub struct AccountsRepository { }


impl AccountsRepository {
    /// Get the current thumbnail for the user
    pub async fn get_current_thumbnail(
        db_pool: &Data<PgPool>, user_id: &Uuid
    ) -> Result<Thumbnail, String> {
        let db = AccountsDb {
            db_pool: db_pool
        };

        return db.get_user_thumbnail(&user_id).await;
    }
    
    /// Update the user's account with the details provided
    pub async fn update_user(
        db_pool: &Data<PgPool>, user_to_update: UpdateUser, user_id: &Uuid
    ) -> Result<(), String> {
        let db = AccountsDb {
            db_pool: db_pool
        };

        return db.update_user(user_to_update, user_id).await;
    }
}