use crate::password::cache::PasswordCache;
use actix_web::web::Data;
use deadpool_redis::Pool as RedisPool;

pub struct PasswordRepository {}

impl PasswordRepository {
    pub async fn set_request_password_change_token(
        redis_pool: &Data<RedisPool>, token: &str, session_key: &str, ttl: i64
    ) {
        let cache = PasswordCache {
            redis_pool: redis_pool
        };

        cache.set_request_password_change_token(token, session_key, ttl).await;
    }

    pub async fn delete_activation_token(
        redis_pool: &Data<RedisPool>, session_key: &str
    ) -> Result<(), String> {
        let cache = PasswordCache {
            redis_pool: redis_pool
        };

        match cache.delete_activation_token(session_key).await {
            Ok(_res) => return Ok(()),
            Err(e) => return Err(e)
        };
    }
}