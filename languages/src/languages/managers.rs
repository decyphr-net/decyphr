use crate::languages::{
    entities::Language,
    repositories::LanguageRepository
};
use actix_web::web::Data;

use sqlx::postgres::PgPool;
use tracing::{event, instrument, Level};


pub struct LanguageManager {
    pub db_pool: Data<PgPool>,
}

impl LanguageManager {

    /// Get all of the languages.
    /// Retrieve all languages from the DB
    #[instrument(name="getting all languages", skip(self))]
    pub async fn get_languages(&self) -> Result<Vec<Language>, String> {
        let languages: Vec<Language> = match LanguageRepository::fetch_languages(
            &self.db_pool
        ).await {
            Ok(r) => r,
            Err(e) => {
                event!(target: "languages", Level::ERROR, "{}", e);
                return Err("Could not retrieve languages at this time".to_string())
            }
        };

        Ok(languages)
    }
}