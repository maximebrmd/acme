use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct ShortLinksClient {
    pub http_client: HttpClient,
}

impl ShortLinksClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers whether this server shortens links (`available`), what a short address starts with (`base`) and how long it is (`shortLength`), and whether the workspace's new posts ask for short links by default (`byDefault`). A post that leaves `shortenLinks` out takes `byDefault` when it is made (the web app, the API, MCP, the command line and feeds alike), and `false` always wins; on a server without short links, nothing is shortened whatever the default. A post that asks goes out with each link written with `http://` or `https://` and longer than a short address replaced by one, one per channel and link, which redirects to it and counts the visit; the text kept stays as written, and Pinterest, Instagram and TikTok always get links as written, as does a link to a channel's own platform. Needs post:read.
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
    ///         .short_links
    ///         .status(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn status(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ShortLinkStatus, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/short-links/status", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Sets whether the workspace's new posts ask for short links unless they say otherwise (`shortenLinks`), whatever makes them: the web app, the API, MCP, the command line and feeds. Each post still chooses for itself, and takes the default when it is made, so a change reaches only posts made after it. Needs organization:update, which owners and admins hold.
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
    ///         .short_links
    ///         .set_default(
    ///             &"workspaceId".to_string(),
    ///             &ShortLinkSettings { by_default: true },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn set_default(
        &self,
        workspace_id: &str,
        request: &ShortLinkSettings,
        options: Option<RequestOptions>,
    ) -> Result<ShortLinkStatus, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!("api/workspaces/{}/short-links/settings", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists the workspace's short links, newest first, 50 a page unless `limit` (at most 100) says otherwise, those of one post (`postId`) or one channel (`channelId`), each with its clicks from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today). Pass the page's `nextCursor` as `cursor` for the next one. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
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
    ///         .short_links
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &ShortLinksListQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        request: &ShortLinksListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ShortLinkPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/short-links", workspace_id),
                None,
                QueryBuilder::new()
                    .string("channelId", request.channel_id.clone())
                    .string("cursor", request.cursor.clone())
                    .serialize("from", request.from.clone())
                    .string("limit", request.limit.clone())
                    .string("postId", request.post_id.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Answers one short link with its clicks each day from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today), oldest first. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
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
    ///         .short_links
    ///         .get(
    ///             &"workspaceId".to_string(),
    ///             &"linkId".to_string(),
    ///             &ShortLinksGetQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        link_id: &str,
        request: &ShortLinksGetQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ShortLinkReport, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/short-links/{}", workspace_id, link_id),
                None,
                QueryBuilder::new()
                    .serialize("from", request.from.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }
}
