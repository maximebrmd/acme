use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct BillingClient {
    pub http_client: HttpClient,
}

impl BillingClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers with the workspace's plan, the subscription that buys it, what each limit allows, how much of it the workspace uses, and every plan to compare. On a server that does not bill, nothing is limited. Needs billing:read.
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
    ///     client.billing.get(&"workspaceId".to_string(), None).await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Billing, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/billing", workspace_id),
                None,
                None,
                options,
            )
            .await
    }
}
