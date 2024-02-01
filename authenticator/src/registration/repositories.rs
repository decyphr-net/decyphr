use crate::registration::{
    cache::RegistrationCache,
    db::RegistrationDb,
    entities::{CreateUser, UserWithoutProfile},
    queries::{ACTIVATE_NEW_USER_QUERY}
};
use actix_web::web::Data;
use deadpool_redis::Pool as RedisPool;

use sqlx::{postgres::PgPool, Error as SqlxError, query};

use tracing::{Level, event,};
use uuid::Uuid;

pub struct UserRegistrationRepository {}

impl UserRegistrationRepository {

    pub async fn create_new_user(
        db_pool: &Data<PgPool>, user_data: &CreateUser
    ) -> Result<Uuid, String> {
        let db = RegistrationDb {
            db_pool: db_pool
        };

        return db.insert_created_user(user_data).await;
    }

    /// Activate a new user's account
    /// 
    /// # Arguments
    /// `db_pool` - The DB pool
    /// `user_id` - The ID of the user to activate
    /// TODO: Move this to RegistrationDb
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

    pub async fn set_activation_token(
        redis_pool: &Data<RedisPool>, token: &str, session_key: &str, ttl: i64
    ) {
        let cache = RegistrationCache {
            redis_pool: redis_pool
        };

        cache.set_activation_token(token, session_key, ttl).await;
    }

    pub async fn delete_activation_token(
        redis_pool: &Data<RedisPool>, session_key: &str
    ) -> Result<(), String> {
        let cache = RegistrationCache {
            redis_pool: redis_pool
        };

        match cache.delete_activation_token(session_key).await {
            Ok(_res) => return Ok(()),
            Err(e) => return Err(e)
        };
    }

    pub async fn get_inactive_user(
        db_pool: &Data<PgPool>, email: &str
    ) -> Result<UserWithoutProfile, String> {
        let db = RegistrationDb {
            db_pool: db_pool
        };

        return db.get_inactive_user(email).await;
    }
}