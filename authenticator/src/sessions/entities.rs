use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub id: Uuid,
    pub user_id: Uuid,
}


pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password: String,
    pub name: String,
    pub thumbnail: Option<String>,
    pub is_active: bool,
    pub is_staff: bool,
    pub is_superuser: bool,
    pub date_joined: DateTime<Utc>,
    pub profile: UserProfile,
}


#[derive(Debug, Deserialize, IntoParams)]
pub struct LoginUser {
    pub email: String,
    pub password: String
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserVisible {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub is_active: bool,
    pub is_staff: bool,
    pub is_superuser: bool,
    pub thumbnail: Option<String>,
    pub date_joined: DateTime<Utc>,
    pub profile: UserProfile,
}
