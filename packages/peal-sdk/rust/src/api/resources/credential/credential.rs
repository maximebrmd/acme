use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct CredentialClient {
    pub http_client: HttpClient,
}

impl CredentialClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers who the credential this request sends is and what it may do, whatever its kind: a person's session or an OAuth client's token (`user`, with the staff member acting as the person, if any, and for an OAuth token the client's scopes and its `binding`: no workspace, the workspace it is bound to with its permissions there, or one the person has left), a workspace's API key (`apiKey`: its name, its start, its workspace, its permissions and when it expires) or a partner key (`partnerKey`: its partner, its scopes and the permissions it holds in each workspace the partner owns). Never the key or the token itself. A revoked or expired key answers 401, a suspended account 403, as on every endpoint; a workspace that requires two-step verification does not refuse this answer, which reads none of its data. It counts toward the rate limit as any request does.
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
    ///     client.credential.get(None).await;
    /// }
    /// ```
    pub async fn get(&self, options: Option<RequestOptions>) -> Result<Credential, ApiError> {
        self.http_client
            .execute_request(Method::GET, "api/credential", None, None, options)
            .await
    }
}
