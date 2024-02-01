use serde::{Deserialize, Serialize};
use utoipa::IntoParams;
use uuid::Uuid;


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ActivationToken {
    pub user_id: Uuid,
    pub session_key: String,
}

#[derive(Deserialize, IntoParams)]
pub struct RegistrationConfirmation {
    pub token: String,
}
