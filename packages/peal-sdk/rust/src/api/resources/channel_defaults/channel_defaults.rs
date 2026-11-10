use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct ChannelDefaultsClient {
    pub http_client: HttpClient,
}

impl ChannelDefaultsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers the options new posts take on the channel when they give none there, or null. Needs post:read and channel:read.
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
    ///         .channel_defaults
    ///         .get(&"workspaceId".to_string(), &"channelId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        channel_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ChannelDefaults, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/channels/{}/default-options",
                    workspace_id, channel_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Keeps these as the channel's default options, instead of any it had: options of the channel's own platform (`TargetOptions`), unfinished as a draft's may be. A new draft, and a post made in one call, takes them on the channel when it gives no options there and no channel set it names does; a draft that is updated keeps what it is given. Defaults are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself. Needs post:update and channel:read.
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
    ///         .channel_defaults
    ///         .set(
    ///             &"workspaceId".to_string(),
    ///             &"channelId".to_string(),
    ///             &NewChannelDefaults {
    ///                 options: TargetOptions::Youtube {
    ///                     data: YouTubeOptions {
    ///                         ..Default::default()
    ///                     },
    ///                 },
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn set(
        &self,
        workspace_id: &str,
        channel_id: &str,
        request: &NewChannelDefaults,
        options: Option<RequestOptions>,
    ) -> Result<ChannelDefaults, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!(
                    "api/workspaces/{}/channels/{}/default-options",
                    workspace_id, channel_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Leaves the channel without default options. Posts already made keep theirs. Needs post:update and channel:read.
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
    ///     client
    ///         .channel_defaults
    ///         .clear(&"workspaceId".to_string(), &"channelId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn clear(
        &self,
        workspace_id: &str,
        channel_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!(
                    "api/workspaces/{}/channels/{}/default-options",
                    workspace_id, channel_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
