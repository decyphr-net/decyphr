pub const GET_USER_THUMBNAIL: &str = "
    SELECT thumbnail FROM users WHERE id=$1";


pub const UPDATE_USER_PROFILE: &str = "
    UPDATE
        users
    SET
        email = COALESCE($1, email),
        password = COALESCE($2, password),
        name = COALESCE($3, name),
        is_active = COALESCE($4, is_active),
        is_staff = COALESCE($5, is_staff),
        is_superuser = COALESCE($6, is_superuser),
        thumbnail = COALESCE($7, thumbnail)
    WHERE 
        id = $8 AND is_active = true
";