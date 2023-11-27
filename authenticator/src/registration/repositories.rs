use crate::registration::{
    entities::CreateUser,
    queries::{ACTIVATE_NEW_USER_QUERY, INSERT_USER_QUERY, INSERT_USER_PROFILE_QUERY}
};

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

pub struct UserRegistrationRepository {}

impl UserRegistrationRepository {
    async fn create_transaction(
        db_pool: &PgPool
    ) -> Result<Transaction<'_, Postgres>, SqlxError> {
        match db_pool.begin().await {
            Ok(transaction) => return Ok(transaction),
            Err(e) => {
                event!(
                    target: "authenticator",
                    Level::ERROR,
                    "Unable to begin DB transcation: {:#?}",
                    e
                );
                return Err(e);
            }
        };
    }

    // Insert the newly created user into the DB
    async fn insert_created_user(
        transaction: &mut Transaction<'_, Postgres>, user_data: &CreateUser
    ) -> Result<Uuid, SqlxError> {
        let user_id = match query(INSERT_USER_QUERY)
        .bind(&user_data.email)
        .bind(&user_data.password)
        .bind(&user_data.name)
        .map(
            |row: PgRow| -> Uuid {
                row.get("id")
            }
        )
        .fetch_one(&mut *transaction)
        .await {
            Ok(id) => id,
            Err(e) => {
                event!(
                    target: "sqlx", Level::ERROR, "failed to insert user: {:#?}", e
                );
                return Err(e);
            }
        };
        
        match query(INSERT_USER_PROFILE_QUERY)
        .bind(user_id)
        .map(
            |row: PgRow| -> Uuid {
                row.get("user_id")
            }
        )
        .fetch_one(&mut *transaction)
        .await {
            Ok(id) => {
                event!(target: "sqlx", Level::INFO, "User profile created successfully");
                Ok(id)
            }
            Err(e) => {
                event!(
                    target: "sqlx",
                    Level::ERROR, 
                    "Failed to insert user profile: {:#?}", 
                    e
                );
                Err(e)
            }
        }
    }

    // Create a new user
    pub async fn create_new_user(
        db_pool: &PgPool, user_data: &CreateUser
    ) -> Result<Uuid, SqlxError> {
        let transaction_result = Self::create_transaction(db_pool).await;
        let mut transaction = match transaction_result {
            Ok(transaction) => transaction,
            Err(e) => return Err(e)
        };
        let insert_created_user_result = Self::insert_created_user(
            &mut transaction, &user_data
        );

        let user_id = match insert_created_user_result.await {
            Ok(id) => Ok(id),
            Err(e) => {
                event!(
                    target: "sqlx", 
                    Level::ERROR, 
                    "Failed to insert user into DB: {:#?}",
                    e
                );
                Err(e)
            }
        };

        return user_id;
    }

    /// Activate a new user's account
    /// 
    /// # Arguments
    /// `db_pool` - The DB pool
    /// `user_id` - The ID of the user to activate
    pub async fn activate_new_user(
        db_pool: &PgPool, user_id: Uuid
    ) -> Result<(), SqlxError> {
        match query(ACTIVATE_NEW_USER_QUERY).bind(user_id).execute(db_pool).await {
            Ok(_) => Ok(()),
            Err(e) => {
                event!(
                    target: "sqlx", Level::ERROR, "Failed to execute query: {:#?}", e
                );
                Err(e)
            }
        }
    }
}