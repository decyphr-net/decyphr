pub const INSERT_USER_QUERY: &str = "
    INSERT INTO 
        users (email, password, name) 
        VALUES ($1, $2, $3)
        RETURNING id;
";

pub const INSERT_USER_PROFILE_QUERY: &str = "
    INSERT INTO user_profile (user_id)
        VALUES ($1)
    ON CONFLICT (user_id)
    DO NOTHING
    RETURNING user_id
";

pub const ACTIVATE_NEW_USER_QUERY: &str = "
    UPDATE users SET is_active=true WHERE id = $1";