use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct SessionClient {
    pub http_client: HttpClient,
}

impl SessionClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers with the signed-in user and every workspace they belong to, with their role and permissions in each, whether the account has two-step verification on, and whether each workspace requires it (a workspace that requires it refuses the user while it is off). API keys belong to a workspace, not a user, and get 403.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client.session.me(None).await;
    /// }
    /// ```
    pub async fn me(&self, options: Option<RequestOptions>) -> Result<Me, ApiError> {
        self.http_client
            .execute_request(Method::GET, "api/me", None, None, options)
            .await
    }
}
