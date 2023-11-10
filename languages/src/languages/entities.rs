use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;


#[derive(Deserialize, Serialize, Clone, FromRow, ToSchema)]
pub struct Language {
    pub uuid: Uuid,
    pub name: String,
    pub local_name: String,
    pub code: String,
    pub short_code: String,
    pub description: String,
}

#[derive(Serialize, ToSchema)]
pub struct ErrorResponse {
    pub error: String,
}
