use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct MembersClient {
    pub http_client: HttpClient,
}

impl MembersClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace's settings show them; an API key may not, as members' addresses are not a script's to read.
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
    ///     client.members.list(&"workspaceId".to_string(), None).await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<WorkspaceMember>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/members", workspace_id),
                None,
                None,
                options,
            )
            .await
    }
}
