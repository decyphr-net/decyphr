use crate::languages::{
    entities::Language,
    queries::GET_ALL_LANGUAGES,
};

use sqlx::{
    postgres::{PgPool},
    Postgres,
    Transaction,
    Error as SqlxError,
    query_as
};
use tracing::{event, Level};

pub struct LanguageRepository {}

impl LanguageRepository {

    async fn create_transaction(
        db_pool: &PgPool
    ) -> Result<Transaction<'_, Postgres>, SqlxError> {
        match db_pool.begin().await {
            Ok(transaction) => return Ok(transaction),
            Err(e) => {
                event!(
                    target: "languages", 
                    Level::ERROR, 
                    "Unable to begin DB transaction: {:#?}",
                    e
                );
                return Err(e);
            }
        };
    }

    pub async fn fetch_languages(
        db_pool: &PgPool
    ) -> Result<Vec<Language>, SqlxError> {
        let mut transaction = match Self::create_transaction(db_pool).await {
            Ok(transaction) => transaction,
            Err(e) => return Err(e)
        };

        let languages: Vec<Language> = query_as(GET_ALL_LANGUAGES)
            .fetch_all(&mut *transaction)
            .await?;
        
        Ok(languages)
    } 
}