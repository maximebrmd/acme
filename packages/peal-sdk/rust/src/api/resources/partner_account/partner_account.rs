use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct PartnerAccountClient {
    pub http_client: HttpClient,
}

impl PartnerAccountClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// The workspace's partner account and what it holds, null when it has none, and whether its people may open one themselves on this server (`canOpen`). Needs partner:read.
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
    ///         .partner_account
    ///         .get(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<PartnerStanding, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/partner", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Opens a partner account for the workspace, which becomes its home workspace, under the name its customers will read; answers the one it has when it has one. On a server that opens partner accounts through its staff only, answers 403 `PartnerAccountsClosed`. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
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
    ///         .partner_account
    ///         .open(
    ///             &"workspaceId".to_string(),
    ///             &OpenPartner {
    ///                 name: "name".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn open(
        &self,
        workspace_id: &str,
        request: &OpenPartner,
        options: Option<RequestOptions>,
    ) -> Result<Partner, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/partner", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Closes the workspace's partner account: its keys stop working at once. Refused while it owns workspaces (409 `PartnerOwnsWorkspaces`): delete each through the partner API first. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
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
    ///         .partner_account
    ///         .close(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn close(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/partner", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Changes the partner account's name, its logo (an HTTPS URL, shown from that address on the hosted pages; null removes it) or its return origins: what is left out stays as it is. `returnOrigins` replaces the whole list, 20 at most: each is an origin as browsers write it (`https://app.example.com`: HTTPS, or HTTP on this machine alone, with nothing after the host and port). A hosted page sends a customer back only to an address whose origin is one of these, exactly. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
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
    ///         .partner_account
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &PartnerChange {
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
        request: &PartnerChange,
        options: Option<RequestOptions>,
    ) -> Result<Partner, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/partner", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists the partner account's keys. Needs partner:read.
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
    ///         .partner_account
    ///         .list_keys(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn list_keys(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<PartnerKey>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/partner/keys", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Creates a partner key, and answers with the key itself, which is not shown again. It acts in every workspace the partner owns, with `permissions` (what a product does for its customers: channels, media, posts, analytics, the writing assistant, webhooks, reading the plan's usage; never members, invitations, API keys or billing changes, which answer 422), and on those workspaces themselves with `scopes`. It never acts in the home workspace, nor in any workspace the partner does not own. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client: keys cannot create keys.
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
    ///         .partner_account
    ///         .create_key(
    ///             &"workspaceId".to_string(),
    ///             &NewPartnerKey {
    ///                 name: "name".to_string(),
    ///                 permissions: vec![Permission::ActivityRead],
    ///                 scopes: vec![PartnerScope::WorkspacesRead],
    ///                 expires_in_days: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create_key(
        &self,
        workspace_id: &str,
        request: &NewPartnerKey,
        options: Option<RequestOptions>,
    ) -> Result<CreatedPartnerKey, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/partner/keys", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Revokes a partner key: it stops working at once. Needs partner:manage.
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
    ///         .partner_account
    ///         .revoke_key(
    ///             &"workspaceId".to_string(),
    ///             &"partnerKeyId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn revoke_key(
        &self,
        workspace_id: &str,
        partner_key_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!(
                    "api/workspaces/{}/partner/keys/{}",
                    workspace_id, partner_key_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the workspaces the partner account owns, newest first, each with the number of channels connected in it, 50 a page unless `limit` (at most 100) says otherwise, with the filters and the paging of the partner API's list. Needs partner:read.
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
    ///         .partner_account
    ///         .list_workspaces(
    ///             &"workspaceId".to_string(),
    ///             &PartnerAccountListWorkspacesQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_workspaces(
        &self,
        workspace_id: &str,
        request: &PartnerAccountListWorkspacesQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<CustomerWorkspacePage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/partner/workspaces", workspace_id),
                None,
                QueryBuilder::new()
                    .string("before", request.before.clone())
                    .string("externalId", request.external_id.clone())
                    .string("limit", request.limit.clone())
                    .string("name", request.name.clone())
                    .build(),
                options,
            )
            .await
    }
}
