use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;


#[derive(Debug, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String,
    pub iat: usize,
    pub exp: usize,
}


#[derive(Debug, Deserialize)]
pub struct QueryCode {
    pub code: String,
    pub state: String,
}


#[derive(Debug, Deserialize)]
pub struct RegisterUserSchema {
    pub name: String,
    pub email: String,
    pub password: String,
}


#[derive(Debug, Deserialize)]
pub struct LoginUserScema {
    pub email: String,
    pub password: String
}


#[derive(Debug)]
pub struct NewUser {
    pub id: Uuid,
    pub email: String,
    pub password: String,
    pub name: String,
    pub is_active: bool,
    pub is_staff: bool,
    pub is_superuser: bool,
    // pub thumbnail: String,
    pub date_joined: DateTime<Utc>,
}


#[derive(Deserialize, Debug)]
pub struct OAuthResponse {
    pub access_token: String,
    pub id_token: String,
}


#[derive(Deserialize)]
pub struct GoogleUserResult {
    pub id: String,
    pub email: String,
    pub verified_email: bool,
    pub name: String,
    pub given_name: String,
    pub family_name: String,
    pub picture: String,
    pub locale: String,
}
