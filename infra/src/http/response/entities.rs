use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize, Debug)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SuccessResponse {
    pub message: String,
}
