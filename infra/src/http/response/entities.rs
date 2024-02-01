use serde::{Deserialize, Serialize};
use utoipa::ToSchema;


#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct SuccessResponse {
    pub message: String,
}


#[derive(Serialize, Deserialize, Debug)]
pub struct RedirectErrorResponse {
    pub error: String,
    pub location: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RedirectSuccessResponse {
    pub message: String,
    pub location: String,
}