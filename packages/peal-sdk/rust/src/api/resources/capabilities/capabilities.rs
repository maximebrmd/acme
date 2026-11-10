use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct CapabilitiesClient {
    pub http_client: HttpClient,
}

impl CapabilitiesClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Describes what a post may hold on every platform, in Peal's order, whether or not the workspace has a channel there: how its text is counted and limited, the images and videos it takes, its options field by field, the lookups that answer their values, and whether Peal reads each post's counts. These are the rules Peal checks when a post is scheduled; a null limit is one Peal does not check, which the platform may still apply. Needs channel:read.
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
    ///     client
    ///         .capabilities
    ///         .platforms(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn platforms(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<PlatformCapabilities>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/platforms/capabilities", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Describes what a post on this channel may hold: its platform's capabilities, and what its own account narrows in them, read from the platform now (a TikTok creator's audiences, the interactions they turned off, their longest video). When the platform cannot be asked, `account` says why and the platform's capabilities are answered alone. Needs channel:read.
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
    ///     client
    ///         .capabilities
    ///         .channel(&"workspaceId".to_string(), &"channelId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn channel(
        &self,
        workspace_id: &str,
        channel_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ChannelCapabilities, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/channels/{}/capabilities",
                    workspace_id, channel_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
