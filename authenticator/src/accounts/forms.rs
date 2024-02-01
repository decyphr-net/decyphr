use actix_multipart::form::{MultipartForm, text::Text, tempfile::TempFile};
use utoipa::IntoParams;


#[derive(MultipartForm, IntoParams)]
pub struct UserForm {
    pub name: Option<Text<String>>,
    #[multipart(limit = "1 MiB")]
    pub thumbnail: Option<TempFile>,
}
