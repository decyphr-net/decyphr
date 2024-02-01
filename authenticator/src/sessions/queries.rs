pub const USER_AND_USER_PROFILE_QUERY: &str = "
    SELECT 
        u.id AS u_id, 
        u.email AS u_email, 
        u.password AS u_password, 
        u.name AS u_name, 
        u.is_active AS u_is_active, 
        u.is_staff AS u_is_staff, 
        u.is_superuser AS u_is_superuser, 
        u.thumbnail AS u_thumbnail, 
        u.date_joined AS u_date_joined, 
        p.id AS p_id, 
        p.user_id AS p_user_id 
    FROM 
        users u 
    LEFT JOIN user_profile p ON p.user_id = u.id 
    WHERE 
        u.is_active = true AND ";
