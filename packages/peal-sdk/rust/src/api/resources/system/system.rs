use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct SystemClient {
    pub http_client: HttpClient,
}

impl SystemClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers as soon as the server is up, whatever the state of its database. Use it as a liveness or container health check.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// Empty response
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
    ///     client.system.health(None).await;
    /// }
    /// ```
    pub async fn health(&self, options: Option<RequestOptions>) -> Result<(), ApiError> {
        self.http_client
            .execute_request(Method::GET, "api/health", None, None, options)
            .await
    }

    /// Answers once the server can reach its database, and fails with DatabaseUnavailable while it cannot. Use it as a readiness check before sending traffic.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// Empty response
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
    ///     client.system.ready(None).await;
    /// }
    /// ```
    pub async fn ready(&self, options: Option<RequestOptions>) -> Result<(), ApiError> {
        self.http_client
            .execute_request(Method::GET, "api/ready", None, None, options)
            .await
    }

    /// Lists the releases of the API, newest first: the operations each added and deprecated, how many additions it made in all, and any change that could break a client, which the versioning policy allows only with a reason. Needs no credentials.
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
    ///     client.system.changelog(None).await;
    /// }
    /// ```
    pub async fn changelog(
        &self,
        options: Option<RequestOptions>,
    ) -> Result<ApiChangelog, ApiError> {
        self.http_client
            .execute_request(Method::GET, "api/changelog", None, None, options)
            .await
    }
}
