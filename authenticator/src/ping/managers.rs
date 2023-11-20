use crate::ping::{
    entities::DBResponse,
    repositories::PingRepository
};
use actix_web::web::Data;

use sqlx::postgres::PgPool;
use tracing::{event, instrument, Level};


pub struct PingManager {
    pub db_pool: Data<PgPool>,
}

impl PingManager {
    pub async fn check_health(&self) -> Result<DBResponse, String> {
        let con_exists = match PingRepository::verify_connection(&self.db_pool).await {
            Ok(r) => r,
            Err(e) => {
                event!(target: "authenticator", Level::ERROR, "{}", e);
                return Err("Could not connect to the DB at this time".to_string())
            }
        };

        Ok(con_exists)
    }
}