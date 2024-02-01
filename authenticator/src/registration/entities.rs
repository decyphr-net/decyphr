use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::IntoParams;
use uuid::Uuid;


#[derive(Deserialize, Serialize, IntoParams, Clone, Debug)]
pub struct NewUser {
    pub email: String,
    pub password: String,
    pub name: String
}


#[derive(Deserialize, Serialize, Clone)]
pub struct CreateUser {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize, IntoParams, Debug)]
pub struct UserEmail{
    pub email: String,
}

#[derive(Serialize, Deserialize)]
pub struct UserWithoutProfile {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub is_active: bool,
    pub is_staff: bool,
    pub is_superuser: bool,
    pub thumbnail: Option<String>,
    pub date_joined: DateTime<Utc>,
}
