use crate::settings::get_settings;
use crate::tokens::entities::ConfirmationToken;

use chrono::{Duration, Local as ChronoLocal};
use argon2::password_hash::rand_core::{OsRng, RngCore};
use core::convert::TryFrom;
use deadpool_redis::redis::{aio::Connection, AsyncCommands, RedisError};
use hex::encode;
use pasetors::claims::{Claims, ClaimsValidationRules};
use pasetors::keys::SymmetricKey;
use pasetors::token::UntrustedToken;
use pasetors::{local, version4::V4, Local as PasetorsLocal};
use tracing::{event, Level};
use uuid::Uuid;


const SESSION_KEY_PREFIX: &str = "valid_session_key_for_{}";

// pub struct TokenManager {

// }


// impl TokenManager {

// }

/// Issues a pasetor token to a user. The token has the user's  ID encoded. A
/// session_key is also encoded. This key is used to destroy the token as soon
/// as it's been verified. Depending on its usage, the token issued has at most
/// an hour to live. Which, it is destroyed after its TTL
#[tracing::instrument(name="Issue pasetors token", skip(redis_connection))]
pub async fn issue_confirmation_token_pasetors(
    user_id: Uuid, 
    redis_connection: &mut Connection, 
    is_for_password_change: Option<bool>,
) -> Result<String, RedisError> {

    // Generate 128 bytes of random data for the session key from something
    // that's cryptographically secure (rand::CryptoRng)
    let session_key: String = {
        let mut buff = [0_u8; 128];
        OsRng.fill_bytes(&mut buff);
        encode(buff)
    };

    let redis_key = {
        if is_for_password_change.is_some() {
            format!(
                "{}{}is_for_password_change", SESSION_KEY_PREFIX, session_key
            )
        } else {
            format!("{}{}", SESSION_KEY_PREFIX, session_key)
        }
    };

    redis_connection.set(redis_key.clone(), String::new(),)
        .await
        .map_err(
            |e| {
                event!(
                    target: "authenticator", Level::ERROR, "RedisError (set): {}", e
                );
                e
            }
        )?;
    
    let settings = get_settings().expect("Cannot load settings");
    let current_date_time = ChronoLocal::now();
    let dt = {
        if is_for_password_change.is_some() {
            current_date_time + Duration::hours(1)
        } else {
            current_date_time + Duration::minutes(settings.secret.token_expiration)
        }
    };

    let time_to_live = {
        if is_for_password_change.is_some() {
            Duration::hours(1)
        } else {
            Duration::minutes(settings.secret.token_expiration)
        }
    };

    redis_connection
        .expire(redis_key.clone(), time_to_live.num_seconds().try_into().unwrap())
        .await
        .map_err(
            |e| {
                event!(
                    target: "authenticator", Level::ERROR, "RedisError (expiry): {}", e
                );
                e
            }
        )?;
    
    let mut claims = Claims::new().unwrap();
    claims.expiration(&dt.to_rfc3339()).unwrap();
    claims
        .add_additional("user_id", serde_json::json!(user_id))
        .unwrap();
    claims
        .add_additional("session_key", serde_json::json!(session_key))
        .unwrap();

    let sk = SymmetricKey::<V4>::from(settings.secret.secret_key.as_bytes()).unwrap();
    Ok(
        local::encrypt(
            &sk, & claims, None, Some(settings.secret.hmac_secret.as_bytes()),
        )
        .unwrap()
    )
}

/// Verifies and destryos a token. A token is destroyed immediately when it has
/// successfully been verified and all encoded data has been extracted.
#[tracing::instrument(name="Verify pasetors token", skip(token, redis_connection))]
pub async fn verify_confirmation_token_pasetor(
    token: String, redis_connection: &mut Connection, is_password: Option<bool>,
) -> Result<ConfirmationToken, String> {
    let settings = get_settings().expect("Cannot load settings");

    let sk = SymmetricKey::<V4>::from(
        settings.secret.secret_key.as_bytes()
    ).unwrap();

    let validation_rules = ClaimsValidationRules::new();
    let untrusted_token = UntrustedToken::<PasetorsLocal, V4>::try_from(&token)
        .map_err(|e| format!("TokenValidation: {}", e))?;
    let trusted_token = local::decrypt(
        &sk,
        &untrusted_token,
        &validation_rules,
        None,
        Some(settings.secret.hmac_secret.as_bytes()),
    )
    .map_err(|e| format!("Pasetor: {}", e))?;

    let claims = trusted_token.payload_claims().unwrap();
    let uid = serde_json::to_value(claims.get_claim("user_id").unwrap()).unwrap();

    match serde_json::from_value::<String>(uid) {
        Ok(uuid_string) => match Uuid::parse_str(&uuid_string) {
            Ok(user_uuid) => {
                let sss_key = serde_json::to_value(
                    claims.get_claim("session_key").unwrap()
                ).unwrap();
                let session_key = match serde_json::from_value::<String>(sss_key) {
                    Ok(session_key) => session_key,
                    Err(e) => return Err(format!("{}", e)),
                };

                let redis_key = {
                    if is_password.is_some() {
                        format!(
                            "{}{}is_for_password_change",
                            SESSION_KEY_PREFIX, 
                            session_key
                        )
                    } else {
                        format!("{}{}", SESSION_KEY_PREFIX, session_key)
                    }
                };

                if redis_connection
                    .get::<_, Option<String>>(redis_key.clone())
                    .await
                    .map_err(|e| format!("{}", e))?
                    .is_none()
                {
                    return Err("Token has been used or expired".to_string());
                }
                redis_connection
                    .del(redis_key.clone())
                    .await
                    .map_err(|e| format!("{}", e))?;
                Ok(ConfirmationToken {user_id: user_uuid})
            }
            Err(e) => Err(format!("{}", e)),
        },
        Err(e) => Err(format!("{}", e)),
    }
}
