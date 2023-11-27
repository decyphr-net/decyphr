use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::registration::controllers::register
    ),
    components(
        schemas(SuccessResponse, ErrorResponse)
    ),
    tags(
        (
            name = "Registration", 
            description = "Registers users using standard password"
        )
    )
)]
pub struct ApiDoc;
