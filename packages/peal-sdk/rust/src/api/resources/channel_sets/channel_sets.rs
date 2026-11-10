use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct ChannelSetsClient {
    pub http_client: HttpClient,
}

impl ChannelSetsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's channel sets, oldest first, each with the channels it keeps and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.
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
    ///         .channel_sets
    ///         .list(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<ChannelSet>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/channel-sets", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Saves a selection of the workspace's channels under a name no other set of the workspace has whatever its case, 50 channels at most, with the options posts take on those whose platform has some (`TargetOptions`, of the channel's platform; unfinished options are kept, and checked when a post that takes them is scheduled). A post names a set by its id or its name (`channelSets`) instead of listing its channels. A workspace keeps 50 sets at most. Needs post:update and channel:read.
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
    ///         .channel_sets
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &ChannelSetDetails {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 name: "name".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &ChannelSetDetails,
        options: Option<RequestOptions>,
    ) -> Result<ChannelSet, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/channel-sets", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Replaces a set's name, channels and options: every channel must be connected now, so this is also how a disconnected one is taken out. Posts made with the set before keep their channels. Needs post:update and channel:read.
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
    ///         .channel_sets
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"channelSetId".to_string(),
    ///             &ChannelSetDetails {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 name: "name".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update(
        &self,
        workspace_id: &str,
        channel_set_id: &str,
        request: &ChannelSetDetails,
        options: Option<RequestOptions>,
    ) -> Result<ChannelSet, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!(
                    "api/workspaces/{}/channel-sets/{}",
                    workspace_id, channel_set_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Deletes a channel set. Its channels, and the posts made with it, stay. Needs post:update.
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
    ///         .channel_sets
    ///         .delete(
    ///             &"workspaceId".to_string(),
    ///             &"channelSetId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn delete(
        &self,
        workspace_id: &str,
        channel_set_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!(
                    "api/workspaces/{}/channel-sets/{}",
                    workspace_id, channel_set_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
