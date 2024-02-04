use serde::{Deserialize};


#[derive(Deserialize)]
pub struct TextToProcess {
    pub text: String,
    pub target_language: String,
    pub source_language: String
}
