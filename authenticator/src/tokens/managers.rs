use crate::tokens::entities::ActivationToken;
use crate::settings::get_settings;

use argon2::password_hash::rand_core::{OsRng, RngCore};
use chrono::{Duration, Local as ChronoLocal};
use core::convert::TryFrom;
use deadpool_redis::redis::{aio::Connection, AsyncCommands};
use hex::encode;
use pasetors::claims::{Claims, ClaimsValidationRules};
use pasetors::keys::SymmetricKey;
use pasetors::token::UntrustedToken;
use pasetors::{local, version4::V4, Local as PasetorsLocal};
use serde_json::json;
use tracing::{instrument, event, Level};
use uuid::Uuid;


const SESSION_KEY_PREFIX: &str = "valid_session_key_for_{}";


#[derive(Clone, Copy)]
pub struct TokenManager {}


impl TokenManager {
    /// Issues a pasetor token to a user. The token has the user's ID encoded. A
    /// session_key is also encoded. This key is used to destroy the token as soon
    /// as it's been verified. Depending on its usage, the token issued has at most
    /// an hour to live. Which, it is destroyed after its TTL
    #[instrument(name="Issue pasetors token", skip(self))]
    pub fn issue_activation_token_pasetors(
        &self,
        user_id: &Uuid, 
        session_key: &str, 
        is_for_password_change: Option<bool>,
        time_to_live: i64,
        hmac_secret: &str,
        secret_key: &str
    ) -> String {
        let current_date_time = ChronoLocal::now();
        let dt = {
            if is_for_password_change.is_some() {
                current_date_time + Duration::hours(1)
            } else {
                current_date_time + Duration::minutes(time_to_live as i64)
            }
        };
        
        let mut claims = Claims::new().unwrap();
        claims.expiration(&dt.to_rfc3339()).unwrap();
        claims.add_additional("user_id", json!(user_id)).unwrap();
        claims.add_additional("session_key", json!(session_key)).unwrap();

        let sk = SymmetricKey::<V4>::from(secret_key.as_bytes()).unwrap();
        local::encrypt(&sk, & claims, None, Some(hmac_secret.as_bytes()))
        .unwrap()
    }

    // Generate 128 bytes of random data for the session key from something
    // that's cryptographically secure (rand::CryptoRng)
    pub fn create_token(&self) -> String {
        let mut buff = [0_u8; 128];
        OsRng.fill_bytes(&mut buff);
        return encode(buff);
    }

    /// Verifies the provided activation token
    #[tracing::instrument(name="Verify pasetors token", skip(self, token))]
    pub async fn verify_activation_token_pasetor(
        self, token: String, is_password: Option<bool>,
    ) -> Result<ActivationToken, String> {
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

                    Ok(
                        ActivationToken {
                            user_id: user_uuid,
                            session_key: session_key
                        }
                    )
                }
                Err(e) => Err(format!("{}", e)),
            },
            Err(e) => Err(format!("{}", e)),
        }
    }
}
