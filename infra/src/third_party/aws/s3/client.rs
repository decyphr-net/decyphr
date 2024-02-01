use crate::third_party::aws::s3::entities::UploadedFile;
use aws_sdk_s3::{
    Client as AwsSdkClient,
    Config as AwsSdkConfig,
    config::{Builder, Credentials as S3Credentials, Region},
    primitives::ByteStream
};
use std::env::var;
use actix_multipart::form::tempfile::TempFile;
use tokio::{io::AsyncReadExt as _, fs::File};


#[derive(Debug, Clone)]
pub struct S3Client {
    s3: AwsSdkClient,
    bucket_name: String,
}


impl S3Client {
    pub fn new(config: AwsSdkConfig) -> Self {
        Self {
            s3: AwsSdkClient::from_conf(config),
            bucket_name: var("AWS_S3_BUCKET_NAME").unwrap()
        }
    }

    pub fn url(&self, key: &str) -> String {
        format!(
            "https://{}.s3.{}.amazonaws.com/{key}",
            var("AWS_S3_BUCKET_NAME").unwrap(),
            var("AWS_REGION").unwrap()
        )
    }

    pub async fn upload(&self, file: &TempFile, key_prefix: &str) -> UploadedFile {
        let filename = file.file_name.as_deref().expect("TODO");
        let key = format!("{key_prefix}{filename}");
        let s3_url = self
            .put_object_from_file(file.file.path().to_str().unwrap(), &key).await;
        UploadedFile::new(filename, key, s3_url)
    }

    async fn put_object_from_file(&self, local_path: &str, key: &str) -> String {
        let mut file = File::open(local_path).await.unwrap();
        let size_estimate = file
            .metadata()
            .await
            .map(|md| md.len())
            .unwrap_or(1024)
            .try_into()
            .expect("File too big");

        let mut contents = Vec::with_capacity(size_estimate);
        file.read_to_end(&mut contents).await.unwrap();

        let _res = self
            .s3
            .put_object()
            .bucket(&self.bucket_name)
            .key(key)
            .body(ByteStream::from(contents))
            .send()
            .await
            .expect("Failed to put object");

        self.url(key)
    }

    pub async fn delete_file(&self, key: &str) -> bool {
        self.s3
            .delete_object()
            .bucket(&self.bucket_name)
            .key(key)
            .send()
            .await
            .is_ok()
    }
}


pub async fn configure_and_return_s3_client() -> S3Client {
    let key = var("AWS_ACCESS_KEY_ID").expect("Failed to get AWS key");
    let key_secret = var("AWS_SECRET_ACCESS_KEY")
        .expect("Failed to get AWS secret key");
    let cred = S3Credentials::new(
        key, key_secret, None, None, "loaded-from-custom-env"
    );

    let region = Region::new(var("AWS_REGION").unwrap_or("eu-west-1".to_string()));
    let config_builder = Builder::new().region(region).credentials_provider(cred);

    let config = config_builder.build();
    S3Client::new(config)
}
