use crate::registration::{
    entities::{CreateUser, UserWithoutProfile},
    queries::{GET_INACTIVE_USER, INSERT_USER_QUERY, INSERT_USER_PROFILE_QUERY}
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
use tracing::{event, Level};
use uuid:: Uuid;


pub struct RegistrationDb<'a> {
    pub db_pool: &'a Data<PgPool>
}


impl<'a> RegistrationDb<'a> {
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
    async fn create_transaction(self) -> Result<Transaction<'a, Postgres>, SqlxError> {
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

    /// Insert the newly created user into the DB. First insert the user record,
    /// followed by the user's profile and return the user's ID
    pub async fn insert_created_user(self, user: &CreateUser) -> Result<Uuid, String> {
        let mut transaction = match self.create_transaction().await {
            Ok(transaction) => transaction,
            Err(e) => return Err(format!("{}", e))
        };
        let user_id = match query(INSERT_USER_QUERY)
            .bind(&user.email)
            .bind(&user.password)
            .bind(&user.name)
            .map(
                |row: PgRow| -> Uuid {
                    row.get("id")
                }
            )
            .fetch_one(&mut *transaction)
            .await {
                Ok(id) => {
                    event!(
                        target: "sqlx", Level::INFO, "inserted user: {:#?}", id
                    );
                    id
                },
                Err(e) => {
                    event!(
                        target: "sqlx", Level::ERROR, "failed to insert user: {:#?}", e
                    );

                    if e
                        .as_database_error()
                        .unwrap()
                        .code()
                        .unwrap()
                        .parse::<i32>()
                        .unwrap() == 23505 
                    {
                        return Err(
                            "A user with that email address all ready exists"
                            .to_string()
                        )
                    } else {
                        return Err("Error inserting user into DB".to_string())
                    }
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
                    event!(
                        target: "sqlx", Level::INFO, "User profile created successfully"
                    );
                    id
                }
                Err(_e) => {
                    return Err("Error inserting user profile into DB".to_string())
                }
            };
        
        match transaction.commit().await {
            Ok(res) => res,
            Err(e) => {
                event!(
                    target: "sqlx", Level::ERROR, "Transaction failed: {:#?}", e
                );
            }
        };
        
        return Ok(user_id)
    }

    /// Get an inactivate user based on their email address
    pub async fn get_inactive_user(
        self, email: &str
    ) -> Result<UserWithoutProfile, String> {
        let mut transaction = match self.create_transaction().await {
            Ok(transaction) => transaction,
            Err(e) => return Err(format!("{}", e))
        };
        match query(GET_INACTIVE_USER)
            .bind(email)
            .map(
                |row: PgRow| UserWithoutProfile {
                    id: row.get("id"),
                    email: row.get("email"),
                    name: row.get("name"),
                    is_active: row.get("is_active"),
                    is_staff: row.get("is_staff"),
                    is_superuser: row.get("is_superuser"),
                    thumbnail: row.get("thumbnail"),
                    date_joined: row.get("date_joined"),
                }
            )
            .fetch_one(&mut *transaction)
            .await {
                Ok(user) => return Ok(user),
                Err(e) => {
                    event!(
                        target: "authenticator", 
                        Level::ERROR, 
                        "User not found in DB: {:#?}", 
                        e
                    );
                    return Err("User not found".to_string())
                }
            }
    }

}