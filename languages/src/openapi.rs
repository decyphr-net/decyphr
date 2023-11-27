use crate::languages::entities::{ErrorResponse, Language};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::languages::controllers::get_all_languages
    ),
    components(
        schemas(Language, ErrorResponse)
    ),
    tags(
        (name = "Languages", description = "Handles support languages in Decyphr")
    )
)]
pub struct ApiDoc;
