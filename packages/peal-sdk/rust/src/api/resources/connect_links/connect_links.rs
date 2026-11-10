use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct ConnectLinksClient {
    pub http_client: HttpClient,
}

impl ConnectLinksClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's connect links, newest first, the last 100: those waiting, and those used, revoked or expired in the last 30 days. Needs channel:read.
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
    ///         .connect_links
    ///         .list(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<ConnectLink>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/connect-links", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Creates a link to hand to whoever owns an account of `platform`: it opens a hosted page where they sign in at the platform and, when the sign-in reaches several accounts, pick those to connect, without a Peal account. The answer holds the link's address, shown this once. The link works once, for 168 hours unless `expiresInHours` (1 to 720) says otherwise; with `channelId`, it reconnects that channel, and only a sign-in to the channel's own account goes through. `returnUrl` is where the page sends them once done, with `peal_link` (the link's id) and `peal_status` (`connected`, `cancelled` or `failed`) in its query: read the link by its id to know what was connected, as anyone can write those parameters. Its origin must be one the workspace's partner account registered, exactly (422 `ReturnUrlNotAllowed` otherwise, and for a workspace without a partner account). Whoever holds the address can connect an account of theirs to the workspace until it is used, revoked or expired: hand it over a channel you trust, and revoke it when it is no longer needed. A platform this server cannot connect answers 422 `ConnectFailed`. A workspace has 100 links waiting at most. Needs channel:connect.
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
    ///         .connect_links
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &NewConnectLink {
    ///                 platform: Platform::X,
    ///                 channel_id: None,
    ///                 connection: None,
    ///                 expires_in_hours: None,
    ///                 locale: None,
    ///                 return_url: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &NewConnectLink,
        options: Option<RequestOptions>,
    ) -> Result<CreatedConnectLink, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/connect-links", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// One connect link of the workspace: where it stands, the channels it connected once `completed`, and how its last sign-in failed. Read it when a browser comes back to your return address, or on `channel.connected`. Needs channel:read.
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
    ///         .connect_links
    ///         .get(&"workspaceId".to_string(), &"linkId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        link_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ConnectLink, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/connect-links/{}", workspace_id, link_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Takes a connect link back: it opens nothing more, and a sign-in in progress through it does not complete. A link already used, revoked or expired stays as it is. Answers the link as it now stands. Needs channel:connect.
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
    ///         .connect_links
    ///         .revoke(&"workspaceId".to_string(), &"linkId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn revoke(
        &self,
        workspace_id: &str,
        link_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ConnectLink, ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/connect-links/{}", workspace_id, link_id),
                None,
                None,
                options,
            )
            .await
    }
}
