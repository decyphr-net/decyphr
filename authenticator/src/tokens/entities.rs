use serde::{Deserialize, Serialize};
use uuid::Uuid;


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConfirmationToken {
    pub user_id: Uuid,
}

#[derive(Deserialize)]
pub struct RegistrationConfirmation {
    pub token: String,
}