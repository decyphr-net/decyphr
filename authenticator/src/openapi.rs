use crate::sessions::entities::UserVisible;
use infra::http::response::entities::{ErrorResponse, SuccessResponse};
use utoipa::OpenApi;


#[derive(OpenApi)]
#[openapi(
    paths(
        crate::accounts::controllers::update_user_details,
        crate::registration::controllers::register,
        crate::registration::controllers::regenerate_token,
        crate::registration::controllers::confirm_registration,
        crate::sessions::controllers::login,
        crate::sessions::controllers::logout,
        crate::sessions::controllers::get_current_user,
    ),
    components(
        schemas(SuccessResponse, ErrorResponse, ErrorResponse),
        schemas(SuccessResponse, ErrorResponse),
        schemas(SuccessResponse, ErrorResponse),
        schemas(SuccessResponse, ErrorResponse),
        schemas(UserVisible, ErrorResponse),
        schemas(SuccessResponse, ErrorResponse),
        schemas(UserVisible, ErrorResponse),
    ),
    tags(
        (
            name = "Update user details", 
            description = "Update a user's details"
        ),
        (
            name = "Registration", 
            description = "Registers users using standard password"
        ),
        (
            name = "Regenerate Token", 
            description = "Regenerates a user's activation token"
        ),
        (
            name = "Activate Account", 
            description = "Activates the user's account if a valid token is provided"
        ),
        (
            name = "Login user", 
            description = "Login a user based on their username and password"
        ),
        (
            name = "Log out user", 
            description = "Log out a user based on the session"
        ),
        (
            name = "Get user", 
            description = "Get a user based on the session"
        ),
    )
)]
pub struct ApiDoc;
