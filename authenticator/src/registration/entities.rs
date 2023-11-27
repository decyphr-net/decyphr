use serde::{Deserialize, Serialize};
use utoipa::IntoParams;


#[derive(Deserialize, Serialize, IntoParams, Clone, Debug,)]
pub struct NewUser {
    pub email: String,
    pub password: String,
    pub name: String
}


#[derive(Deserialize, Serialize)]
pub struct CreateUser {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ConfirmRegistrationErrorResponse {
    pub error: String,
    pub location: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ConfirmRegistrationSuccessResponse {
    pub message: String,
    pub location: String,
}