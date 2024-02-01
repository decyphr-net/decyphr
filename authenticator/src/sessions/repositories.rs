use crate::sessions::{entities::User, db::SessionDb};
use actix_web::web::Data;
use sqlx::postgres::PgPool;
use uuid::Uuid;


pub struct SessionRepository { }


impl SessionRepository {
    pub async fn get_active_user(
        db_pool: &Data<PgPool>, id: Option<&Uuid>, email: Option<&String>
    ) -> Result<User, String> {
        let db = SessionDb {
            db_pool: db_pool
        };

        return db.get_active_user(&id, email).await;
    }
}
