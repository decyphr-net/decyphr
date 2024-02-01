use actix_web::web::Data;
use deadpool_redis::{Connection as DeadPoolConnection, Pool as RedisPool, redis::cmd};
use tracing::{event, Level};

const SESSION_KEY_PREFIX: &str = "valid_session_key_for_";


pub struct PasswordCache<'a> {
    pub redis_pool: &'a Data<RedisPool>
}


impl<'a> PasswordCache<'a> {

    /// Create the Redis connection
    async fn create_redis_connection(self) -> DeadPoolConnection {
        let redis_con = self.redis_pool
            .get()
            .await
            .map_err(
                |e| {
                    event!(target: "authenticator", Level::ERROR, "{}", e);
                    return "We cannot process your request to change your password at the moment";
                }
            )
            .expect("Redis connection cannot be retrieved");
        redis_con
    }

    /// Set the user's password change request token in Redis. This should also be set
    /// to expire based on the `ttl` config's `ttl` value
    /// TODO: Use different ttl value
    pub async fn set_request_password_change_token(
        self, activation_token: &str, session_key: &str, ttl: i64
    ) {
        let mut redis_con = self.create_redis_connection().await;
        let redis_key = format!("{}{}", SESSION_KEY_PREFIX, session_key);

        match cmd("SET")
            .arg(&redis_key).arg(activation_token)
            .query_async::<_, ()>(&mut redis_con).await {
                Ok(res) => res,
                Err(e) => {
                    event!(target: "authenticator", Level::ERROR, "{}", e);
                }
            };

        match cmd("EXPIRE")
            .arg(&redis_key).arg(350)
            .query_async::<_, ()>(&mut redis_con).await {
                Ok(res) => res,
                Err(e) => {
                    event!(target: "authenticator", Level::ERROR, "{}", e);
                }
            };
    }

    /// Delete the user's activation token from Redis
    pub async fn delete_activation_token(
        self, session_key: &str
    ) -> Result<(), String> {
        let mut redis_con = self.create_redis_connection().await;
        let redis_key = format!("{}{}", SESSION_KEY_PREFIX, session_key);

        match cmd("DEL")
            .arg(&redis_key)
            .query_async::<_, ()>(&mut redis_con).await {
                Ok(_res) => return Ok(()),
                Err(e) => {
                    event!(target: "authenticator", Level::ERROR, "{}", e);
                    return Err(
                        "It appears that your token has expired"
                        .to_string()
                    )
                }
            };
    }
}
