use crate::ENV;
use crate::settings::get_settings;

use chrono::{Local as ChronoLocal, Duration};
use lettre::{
    AsyncSmtpTransport,
    AsyncTransport,
    Message,
    message::{MultiPart, SinglePart, header::ContentType},
    transport::smtp::authentication::Credentials,
    Tokio1Executor
};
use minijinja::context;
use tokio::spawn;
use tracing::{event, instrument, Level};
use uuid::Uuid;

/// Send Email
/// 
/// Send an email async. This function will send an email to the given recipient, from
/// the given sender, with the given subject/body
#[instrument(
    name="Generic e-mail sending function",
    skip(recipient_email, recipient_name, subject, html_content, text_content,),
)]
pub async fn send_email(
    sender_email: Option<String>,
    recipient_email: String,
    recipient_name: String,
    subject: impl Into<String>,
    html_content: impl Into<String>,
    text_content: impl Into<String>,
) -> Result<(), String> {
    let settings = get_settings().expect("Failed to read settings");

    let email = Message::builder().from(
        format!(
            "{} <{}>",
            "Decyhpr Authentication",
            if sender_email.is_some() {
                sender_email.unwrap()
            } else {
                settings.email.host_user.clone()
            }
        )
        .parse()
        .unwrap(),
    )
    .to(format!("{} <{}>", [recipient_name].join(" "), recipient_email)
    .parse()
    .unwrap())
    .subject(subject)
    .multipart(
        MultiPart::alternative()
            .singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_PLAIN).body(text_content.into()),
            )
            .singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML).body(html_content.into()),
            ),
    )
    .unwrap();

    let creds = Credentials::new(
        settings.email.host_user,
        settings.email.host_user_password
    );

    let mailer: AsyncSmtpTransport<Tokio1Executor> = 
        AsyncSmtpTransport::<Tokio1Executor>::relay(&settings.email.host)
            .unwrap()
            .credentials(creds)
            .build();
    
    match mailer.send(email).await {
        Ok(_) => {
            event!(target: "authenticator", Level::INFO, "Email successfully sent!");
            Ok(())
        }
        Err(e) => {
            event!(
                target: "authenticator", Level::ERROR, "Could not send email: {:#?}", e
            );
            Err(format!("Could not send email: {:#?}", e))
        }
    }
}


/// Send Multipart email
/// 
/// Setup up the tokens and email contents (including templates) for sending and then
/// calls the `send_email` function at the end 
#[instrument(name="Generic multipart e-mail sending function")]
pub async fn send_multipart_email(
    subject: String,
    user_id: Uuid,
    recipient_email: String,
    recipient_name: String,
    template_name: &str,
    token: &str,
) -> Result<(), String> {
    let settings = get_settings().expect("Failed to read settings");

    let title = subject.clone();

    let web_address = {
        if settings.debug {
            format!("{}:{}", settings.application.base_url, settings.application.port)
        } else {
            settings.application.base_url
        }
    };
    let activation_link = {
        if template_name == "password_reset_email.html" {
            format!(
                "http://127.0.0.1:5001/api/auth/password/confirm-change-password?token={}",
                token,
            )
        } else {
            format!(
                "http://127.0.0.1:5001/api/auth/registration/register/confirm?token={}", token
            )
        }
    };
    let dt = ChronoLocal::now() + Duration::minutes(settings.secret.token_expiration);

    let template = ENV.get_template(template_name).unwrap();
    let ctx = context! {
        title => &title,
        activation_link => &activation_link,
        domain => &settings.frontend_url,
        expiration_time => &settings.secret.token_expiration,
        exact_time => &dt.format("%A %B %d, %Y at %r").to_string()
    };
    let html_text = template.render(ctx).unwrap();

    let text = format!(
        "Tap the link below to confirm your email address. {}",activation_link
    );
    spawn(send_email(None, recipient_email, recipient_name, subject, html_text, text));
    Ok(())
}