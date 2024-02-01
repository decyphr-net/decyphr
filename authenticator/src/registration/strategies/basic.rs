use crate::password::managers::PasswordManager;
use crate::email::managers::send_multipart_email;
use crate::registration::{
    entities::{CreateUser, NewUser}, managers::UserRegistrationManager,
};
use crate::settings::get_settings;
use crate::tokens::managers::TokenManager;
use actix_web::web::Data;
use deadpool_redis::Pool as RedisPool;
use sqlx::postgres::PgPool;


/// TODO: Remove this in favour of the manager
pub struct BasicAuth {
    pub db_pool: Data<PgPool>,
    pub redis_pool: Data<RedisPool>,
}


impl BasicAuth {
    pub async fn create_user(self, new_user: NewUser) -> Result<String, String> {
        let password_manager = PasswordManager {
            db_pool: self.db_pool.to_owned(),
            redis_pool: self.redis_pool.to_owned(),
        };

        let hashed_password = password_manager.create_password(new_user.password).await;

        let create_new_user = CreateUser {
            password: hashed_password,
            email: new_user.email.clone(), 
            name: new_user.name.clone()
        };

        let manager = UserRegistrationManager {
            db_pool: self.db_pool,
            redis_pool: Some(self.redis_pool),
            token_manager: Some(TokenManager {})
        };

        let user_id = match manager.create_new_user(create_new_user).await {
            Ok(user_id) => user_id,
            Err(e) => return Err(e)
        };

        let settings = get_settings().expect("Cannot load settings");
        let token_manager: TokenManager = TokenManager {};

        let session_key: String = token_manager.create_token();

        let issued_token = token_manager.issue_activation_token_pasetors(
            &user_id,
            &session_key, 
            None, 
            settings.secret.token_expiration.clone(), 
            &settings.secret.hmac_secret,
            &settings.secret.secret_key,
        );

        manager.set_activation_token(
            &issued_token, 
            &session_key, 
            settings.secret.token_expiration.clone()
        ).await;

        send_multipart_email(
            "Decyphr - Let's get you verified".to_string(),
            user_id,
            new_user.email.clone(),
            new_user.name.clone(),
            "verification_email.html",
            &issued_token,
        )
        .await
        .unwrap();

        Ok(
            "Your account has been created successfully! We have sent you an 
            activation email for you to activate your account"
            .to_string()
        )
    }
}
