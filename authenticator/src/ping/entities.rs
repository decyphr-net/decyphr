use serde::Serialize;
use sqlx::FromRow;


#[derive(Serialize, FromRow, Debug)]
pub struct DBResponse {
    pub con_exists: Option<i32>
}
