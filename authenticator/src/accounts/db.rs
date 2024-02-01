use crate::accounts::{
    entities::{Thumbnail, UpdateUser}, 
    queries::{GET_USER_THUMBNAIL, UPDATE_USER_PROFILE}
};

use actix_web::web::Data;
use sqlx::{
    Row,
    postgres::{PgPool, PgRow},
    Transaction,
    Postgres,
    Error as SqlxError,
    query,
};
use tracing::{Level, event,};
use uuid::Uuid;


pub struct AccountsDb<'a> {
    pub db_pool: &'a Data<PgPool>
}


impl<'a> AccountsDb<'a> {

    /// Create the DB transaction
    /// 
    /// Example Usage:
    /// ```rust
    /// // Create a new transaction
    /// let mut transaction = match self.create_transaction().await {
    ///     Ok(transaction) => transaction,
    ///     Err(e) => return Err(format!("{}", e))
    /// };
    /// 
    /// // Pass transaction to query
    /// match query(QUERY_NAME).fetch_one(&mut *transaction)
    /// ``` 
    async fn create_transaction(&self) -> Result<Transaction<'a, Postgres>, SqlxError> {
        match self.db_pool.begin().await {
            Ok(transaction) => return Ok(transaction),
            Err(e) => {
                event!(
                    target: "authenticator",
                    Level::ERROR,
                    "Unable to begin DB transaction: {:#?}",
                    e
                );
                return Err(e);
            }
        };
    }

    pub async fn get_user_thumbnail(
        &self, &id: &Uuid
    ) -> Result<Thumbnail, String> {
        let mut transaction = match self.create_transaction().await {
            Ok(transaction) => transaction,
            Err(e) => return Err(format!("{}", e))
        };

        return match query(GET_USER_THUMBNAIL)
            .bind(&id)
            .map(
                |row: PgRow| Thumbnail {
                    thumbnail: row.get("thumbnail")
                }
            )
            .fetch_one(&mut *transaction)
            .await {
                Ok(image_url) => Ok(image_url),
                Err(e) => {
                    event!(
                        target: "sqlx",
                        Level::ERROR,
                        "Failed to get user thumbnail from the DB: {:#?}",
                        e
                    );
                    Err("Error getting thumbnail from DB".to_string())
                }
            };
    }

    pub async fn update_user(
        &self, user_to_update: UpdateUser, user_id: &Uuid
    ) -> Result<(), String> {
        let mut transaction = match self.create_transaction().await {
            Ok(transaction) => transaction,
            Err(e) => return Err(format!("{}", e))
        };

        match query(
            UPDATE_USER_PROFILE
        )
            .bind(&user_to_update.email)
            .bind(&user_to_update.password)
            .bind(&user_to_update.name)
            .bind(&user_to_update.is_active)
            .bind(&user_to_update.is_staff)
            .bind(&user_to_update.is_superuser)
            .bind(&user_to_update.thumbnail)
            .bind(user_id)
            .execute(&mut *transaction)
            .await {
                Ok(res) => res,
                Err(e) => {
                    event!(
                        target: "sqlx", Level::ERROR, "Failed to execute query: {:#?}", e
                    );
                    return Err(e.to_string())
                }
            };
        
        match transaction.commit().await {
            Ok(_) => return Ok(()),
            Err(e) => {
                event!(
                    target: "sqlx", Level::ERROR, "Transaction failed: {:#?}", e
                );
                return Err(e.to_string())
            }
        };
    }
}