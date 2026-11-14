use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct ChannelsClient {
    pub http_client: HttpClient,
}

impl ChannelsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.
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
    ///     client.channels.list(&"workspaceId".to_string(), None).await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<Channel>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/channels", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the workspace's channels a page at a time, oldest first: 50 unless `limit` (at most 100) says otherwise. Every filter given must hold: `platform`, `status` (`active`, `refreshNeeded` or `disabled`) and `q`, text the channel's handle, the name its platform shows or the name the workspace gave it holds, whatever its case. `counts` says how many channels the platform and text match in each status, whatever the status asked for. Pass the page's `nextCursor` as `cursor`, with the same filters, for the next page; a cursor no page gave is a bad request. Needs channel:read.
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
    ///         .channels
    ///         .find(
    ///             &"workspaceId".to_string(),
    ///             &FindQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn find(
        &self,
        workspace_id: &str,
        request: &FindQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ChannelPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/channels/search", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .serialize("platform", request.platform.clone())
                    .string("q", request.q.clone())
                    .serialize("status", request.status.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.
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
    ///         .channels
    ///         .platforms(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn platforms(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ConnectablePlatforms, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/channels/platforms", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Connects a website, to publish articles to it: a WordPress site, by its address, the login name of the user Peal publishes as and an application password made for Peal on that user's profile page. Peal finds the site's REST API, checks the user may publish posts and upload files, and keeps the password encrypted. The site must be on HTTPS at a public address (SiteNotConnected `addressNotAllowed`); one that has no WordPress REST API is `notWordPress`, a refused password `credentialsRefused`, a user who may not publish `cannotPublish`. A site that does not answer, or fails on its side, is PlatformUnreachable. A site the workspace has already is reconnected with the new password. A site counts as one channel: a new one needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.
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
    ///         .channels
    ///         .connect_site(
    ///             &"workspaceId".to_string(),
    ///             &ConnectSite {
    ///                 address: "address".to_string(),
    ///                 application_password: "applicationPassword".to_string(),
    ///                 platform: SitePlatform::Wordpress,
    ///                 user_name: "userName".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn connect_site(
        &self,
        workspace_id: &str,
        request: &ConnectSite,
        options: Option<RequestOptions>,
    ) -> Result<Channel, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/channels/websites", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached, and an X account needs a payment method on per-account pricing, as X's calls are billed at X's rates (UsageAllowanceReached `xApi`, `paymentMethodRequired` without one). Needs channel:connect.
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
    ///         .channels
    ///         .connect(
    ///             &"workspaceId".to_string(),
    ///             &Platform::X,
    ///             &ConnectChannel {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn connect(
        &self,
        workspace_id: &str,
        platform: &Platform,
        request: &ConnectChannel,
        options: Option<RequestOptions>,
    ) -> Result<Authorization, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/channels/connect/{}",
                    workspace_id, platform
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached), and, on a server that bills, an X account a payment method (UsageAllowanceReached `xApi`). Needs channel:connect.
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
    ///         .channels
    ///         .complete_connect(
    ///             &"workspaceId".to_string(),
    ///             &Platform::X,
    ///             &ConnectCallback {
    ///                 state: "state".to_string(),
    ///                 code: None,
    ///                 error: None,
    ///                 iss: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn complete_connect(
        &self,
        workspace_id: &str,
        platform: &Platform,
        request: &ConnectCallback,
        options: Option<RequestOptions>,
    ) -> Result<ConnectOutcome, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/channels/connect/{}/callback",
                    workspace_id, platform
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.
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
    ///         .channels
    ///         .choose_accounts(
    ///             &"workspaceId".to_string(),
    ///             &Platform::X,
    ///             &ChooseAccounts {
    ///                 account_ids: vec!["accountIds".to_string()],
    ///                 selection: "selection".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn choose_accounts(
        &self,
        workspace_id: &str,
        platform: &Platform,
        request: &ChooseAccounts,
        options: Option<RequestOptions>,
    ) -> Result<Vec<Channel>, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/channels/connect/{}/accounts",
                    workspace_id, platform
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. With `messages=true`, the sign-in also asks for the account's direct messages where the platform asks for them apart: on Bluesky, the chat methods' permissions, which turning a channel's messages on needs (`setChannelMessages` answers 409 `InboxActionUnavailable`, `reconnect`, until they are granted). A reconnect of a Bluesky channel that granted them asks them again, so its messages stay readable. Needs channel:connect.
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
    ///         .channels
    ///         .reconnect(
    ///             &"workspaceId".to_string(),
    ///             &"channelId".to_string(),
    ///             &ReconnectQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn reconnect(
        &self,
        workspace_id: &str,
        channel_id: &str,
        request: &ReconnectQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<Authorization, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/channels/{}/reconnect",
                    workspace_id, channel_id
                ),
                None,
                QueryBuilder::new()
                    .serialize("messages", request.messages.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.
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
    ///         .channels
    ///         .disconnect(&"workspaceId".to_string(), &"channelId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn disconnect(
        &self,
        workspace_id: &str,
        channel_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/channels/{}", workspace_id, channel_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Gives the channel the name the workspace calls it by (`label`, 60 characters at most, on one line), or takes it back with null. The name is Peal's own: it is shown beside the handle and name the platform gives the account, which stay, and is sent to no platform. Needs channel:connect.
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
    ///         .channels
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"channelId".to_string(),
    ///             &ChannelUpdate {
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
        channel_id: &str,
        request: &ChannelUpdate,
        options: Option<RequestOptions>,
    ) -> Result<Channel, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/channels/{}", workspace_id, channel_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Turns the channel off: nothing goes out on it until it is turned back on. It keeps its connection, its history, its name and its place in the plan's count, and no reconnect reminder is sent meanwhile. A post that reaches its time while the channel is off fails on that channel (`channelDisabled`) and goes out on its others; it is not sent later. A channel already off stays as it is. Needs channel:connect.
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
    ///         .channels
    ///         .disable(&"workspaceId".to_string(), &"channelId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn disable(
        &self,
        workspace_id: &str,
        channel_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Channel, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/channels/{}/disable",
                    workspace_id, channel_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Turns a channel back on. It posts again at once, or has the status `refreshNeeded` when its token stopped working or ran out while it was off: reconnect the account then. A channel that is on stays as it is. Needs channel:connect.
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
    ///         .channels
    ///         .enable(&"workspaceId".to_string(), &"channelId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn enable(
        &self,
        workspace_id: &str,
        channel_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Channel, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/channels/{}/enable",
                    workspace_id, channel_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
