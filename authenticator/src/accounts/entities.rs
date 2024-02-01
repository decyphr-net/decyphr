use serde::Deserialize;
use actix_multipart::form::tempfile::TempFile;


#[derive(Debug)]
pub struct UserToUpdate {
    pub email: Option<String>,
    pub name: Option<String>,
    pub password: Option<String>,
    pub is_active: Option<bool>,
    pub is_staff: Option<bool>,
    pub is_superuser: Option<bool>,
    pub thumbnail: Option<TempFile>,
}


#[derive(Deserialize, Debug)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub name: Option<String>,
    pub password: Option<String>,
    pub is_active: Option<bool>,
    pub is_staff: Option<bool>,
    pub is_superuser: Option<bool>,
    pub thumbnail: Option<String>,
}


#[derive(Clone, Deserialize)]
pub struct Thumbnail {
    pub thumbnail: Option<String>,
}
