use serde::Deserialize;


#[derive(Deserialize)]
pub struct ConfirmPasswordChangeParams {
    pub token: String,
}


#[derive(Deserialize)]
pub struct NewPassword {
    pub token: String,
    pub password: String,
}