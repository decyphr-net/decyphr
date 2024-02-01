use crate::sessions::{
    entities::{User, UserProfile}, queries::{USER_AND_USER_PROFILE_QUERY}
};

use actix_web::web::Data;
use sqlx::{
    Row,
    postgres::{PgPool, PgRow},
    Transaction,
    Postgres,
    Error as SqlxError,
    query_builder::QueryBuilder
};
use tracing::{Level, event,};
use uuid::Uuid;


pub struct SessionDb<'a> {
    pub db_pool: &'a Data<PgPool>
}


impl<'a> SessionDb<'a> {

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

    pub async fn get_active_user(
        self, id: &Option<&Uuid>, email: Option<&String>
    ) -> Result<User, String> {
        let mut transaction = match self.create_transaction().await {
            Ok(transaction) => transaction,
            Err(e) => return Err(format!("{}", e))
        };

        let mut qb = QueryBuilder::new(USER_AND_USER_PROFILE_QUERY);

        if let Some(id) = id {
            qb.push(" u.id=");
            qb.push_bind(id);
        };

        if let Some(email) = email {
            qb.push(" u.email=");
            qb.push_bind(email);
        };

        let db_query = qb.build().map(
            |row: PgRow| User {
                id: row.get("u_id"),
                email: row.get("u_email"),
                name: row.get("u_name"),
                password: row.get("u_password"),
                is_active: row.get("u_is_active"),
                is_staff: row.get("u_is_staff"),
                is_superuser: row.get("u_is_superuser"),
                thumbnail: row.get("u_thumbnail"),
                date_joined: row.get("u_date_joined"),
                profile: UserProfile {
                    id: row.get("p_id"),
                    user_id: row.get("p_user_id"),
                }
            }
        )
        .fetch_one(&mut *transaction)
        .await;
        
        match db_query {
            Ok(user) => Ok(user),
            Err(e) => {
                event!(target: "sqlx", Level::ERROR, "User not found: {:#?}", e);
                Err("User not found".to_string())
            }
        }
    
    }
}
