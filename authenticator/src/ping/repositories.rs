use crate::ping::{
    entities::DBResponse,
    queries::VERIFY_CONNECTION,
};

use sqlx::{
    postgres::{PgPool},
    Postgres,
    Transaction,
    Error as SqlxError,
    query_as
};
use tracing::{event, Level};


pub struct PingRepository {}


impl PingRepository {

    async fn create_transaction(
        db_pool: &PgPool
    ) -> Result<Transaction<'_, Postgres>, SqlxError> {
        match db_pool.begin().await {
            Ok(transaction) => return Ok(transaction),
            Err(e) => {
                event!(
                    target: "db", 
                    Level::ERROR, 
                    "Unable to begin DB transaction: {:#?}",
                    e
                );
                return Err(e);
            }
        };
    }

    pub async fn verify_connection(
        db_pool: &PgPool
    ) -> Result<DBResponse, SqlxError> {
        let mut transaction = match Self::create_transaction(db_pool).await {
            Ok(transaction) => transaction,
            Err(e) => return Err(e)
        };

        let con_exists: DBResponse = query_as(VERIFY_CONNECTION)
            .fetch_one(&mut *transaction)
            .await?;
        
        Ok(con_exists)
    } 
}
