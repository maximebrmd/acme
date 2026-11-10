use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct AdsClient {
    pub http_client: HttpClient,
}

impl AdsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Says what this server offers of ads (`off`, `read` or `spend`) and on which networks. Needs ads:read.
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
    ///     client.ads.status(&"workspaceId".to_string(), None).await;
    /// }
    /// ```
    pub async fn status(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<AdsStatus, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the workspace's sign-ins to ad networks, oldest first: who signed in, whether the network still takes the sign-in, and whether it may run ads. Never a token. Needs ads:read.
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
    ///         .ads
    ///         .list_connections(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn list_connections(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<AdConnection>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads/connections", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Starts a sign-in to an ad network and answers the page to send the member's browser to. The sign-in asks for reading only on a server that offers no spending. Only a person does this, signed in to Peal in their own session, who manages ad accounts (ads:manage): never an API key, an application or staff acting as them.
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
    ///         .ads
    ///         .connect(&"workspaceId".to_string(), &AdNetwork::Meta, None)
    ///         .await;
    /// }
    /// ```
    pub async fn connect(
        &self,
        workspace_id: &str,
        network: &AdNetwork,
        options: Option<RequestOptions>,
    ) -> Result<AdSignIn, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/ads/connections/{}",
                    workspace_id, network
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Completes a sign-in with what the network's page sent back, and answers the ad accounts it reaches. Nothing is connected yet: `connectAccounts` connects those chosen. A sign-in is completed once, within 15 minutes, by who started it. Needs ads:manage, in person.
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
    ///         .ads
    ///         .complete_connect(
    ///             &"workspaceId".to_string(),
    ///             &AdNetwork::Meta,
    ///             &AdSignInCallback {
    ///                 state: "state".to_string(),
    ///                 code: None,
    ///                 error: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn complete_connect(
        &self,
        workspace_id: &str,
        network: &AdNetwork,
        request: &AdSignInCallback,
        options: Option<RequestOptions>,
    ) -> Result<AdSignInResult, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/ads/connections/{}/callback",
                    workspace_id, network
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists the ad accounts a sign-in reaches now, as the network gives them: currency, time zone, status and spend cap, and whether the workspace already connects each. Only who signed in reads it (ads:manage, in person).
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
    ///         .ads
    ///         .reachable_accounts(
    ///             &"workspaceId".to_string(),
    ///             &"connectionId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn reachable_accounts(
        &self,
        workspace_id: &str,
        connection_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<ReachableAdAccount>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/ads/connections/{}/accounts",
                    workspace_id, connection_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Connects some of the ad accounts a sign-in reaches, 25 at most, by the ids the network gives them. The network is asked again which accounts the sign-in reaches: one it does not reach is `AdAccountNotFound`, and nothing is connected. An account connected before stays as it is. Spending is off on every new account until an owner turns it on. Only who signed in does this (ads:manage, in person).
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
    ///         .ads
    ///         .connect_accounts(
    ///             &"workspaceId".to_string(),
    ///             &"connectionId".to_string(),
    ///             &AdAccountsToConnect {
    ///                 external_ids: vec!["externalIds".to_string()],
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn connect_accounts(
        &self,
        workspace_id: &str,
        connection_id: &str,
        request: &AdAccountsToConnect,
        options: Option<RequestOptions>,
    ) -> Result<Vec<AdAccount>, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/ads/connections/{}/accounts",
                    workspace_id, connection_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Removes a sign-in, its token, the ad accounts it connects and what was read of them; their boosts' records stay with the workspace, and what they committed still counts once the same account is connected again. Refused while one of their boosts runs, may run, is paused or is being made (`AdAccountBusy`): stop them first. What runs at the network that Peal did not make is left as it is. Needs ads:manage.
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
    ///         .ads
    ///         .disconnect(
    ///             &"workspaceId".to_string(),
    ///             &"connectionId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn disconnect(
        &self,
        workspace_id: &str,
        connection_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!(
                    "api/workspaces/{}/ads/connections/{}",
                    workspace_id, connection_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the workspace's connected ad accounts, oldest first, with whether each may spend through Peal and its monthly ceiling. Needs ads:read.
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
    ///         .ads
    ///         .list_accounts(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn list_accounts(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<AdAccount>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads/accounts", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Shows an ad account with what its boosts made through Peal commit in the current calendar month of its time zone. Needs ads:read.
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
    ///         .ads
    ///         .get_account(&"workspaceId".to_string(), &"accountId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get_account(
        &self,
        workspace_id: &str,
        account_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<AdSpending, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/ads/accounts/{}",
                    workspace_id, account_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Disconnects an ad account: what was read of it goes with it, and its boosts' records stay with the workspace, so what they committed still counts against the ceiling once the same account is connected again. Refused while one of its boosts runs, may run, is paused or is being made (`AdAccountBusy`), as a paused campaign may run again. Needs ads:manage.
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
    ///         .ads
    ///         .remove_account(&"workspaceId".to_string(), &"accountId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn remove_account(
        &self,
        workspace_id: &str,
        account_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!(
                    "api/workspaces/{}/ads/accounts/{}",
                    workspace_id, account_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Decides whether an ad account may spend through Peal, and how much: `enabled` with a `monthlyCeiling` in the account's currency, the most its boosts may commit in one calendar month of its time zone. A ceiling may always be lowered, under running boosts too: they run on, and nothing new starts or resumes until there is room. Turning spending off is refused while a boost runs or may run (`AdAccountBusy`). Only an owner does this, signed in to Peal in their own session (ads:authorize): never an admin, an API key, an application or staff acting as an owner. Peal never turns spending on or raises a ceiling on its own.
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
    ///         .ads
    ///         .set_spending(
    ///             &"workspaceId".to_string(),
    ///             &"accountId".to_string(),
    ///             &AdSpendingDecision {
    ///                 enabled: true,
    ///                 monthly_ceiling: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn set_spending(
        &self,
        workspace_id: &str,
        account_id: &str,
        request: &AdSpendingDecision,
        options: Option<RequestOptions>,
    ) -> Result<AdSpending, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!(
                    "api/workspaces/{}/ads/accounts/{}/spending",
                    workspace_id, account_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists an ad account's campaigns as last read from its network (every hour), those made outside Peal included, with what their ads did over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A thousand at most. Needs ads:read.
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
    ///         .ads
    ///         .list_campaigns(
    ///             &"workspaceId".to_string(),
    ///             &"accountId".to_string(),
    ///             &ListCampaignsQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_campaigns(
        &self,
        workspace_id: &str,
        account_id: &str,
        request: &ListCampaignsQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<AdCampaignReport, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/ads/accounts/{}/campaigns",
                    workspace_id, account_id
                ),
                None,
                QueryBuilder::new()
                    .serialize("from", request.from.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Lists an ad account's ads as last read, those of one campaign with `campaignId` (the network's id), each with the workspace's own post it promotes when it is one, and what it did over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A thousand at most. Needs ads:read.
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
    ///         .ads
    ///         .list_ads(
    ///             &"workspaceId".to_string(),
    ///             &"accountId".to_string(),
    ///             &ListAdsQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_ads(
        &self,
        workspace_id: &str,
        account_id: &str,
        request: &ListAdsQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<AdReport, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/ads/accounts/{}/ads",
                    workspace_id, account_id
                ),
                None,
                QueryBuilder::new()
                    .serialize("from", request.from.clone())
                    .serialize("to", request.to.clone())
                    .string("campaignId", request.campaign_id.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Sums what an ad account's ads did each day: spend, impressions, reach, clicks and results, over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A day is kept 396 days. Needs ads:read.
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
    ///         .ads
    ///         .list_insights(
    ///             &"workspaceId".to_string(),
    ///             &"accountId".to_string(),
    ///             &ListInsightsQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_insights(
        &self,
        workspace_id: &str,
        account_id: &str,
        request: &ListInsightsQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<AdInsightReport, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/ads/accounts/{}/insights",
                    workspace_id, account_id
                ),
                None,
                QueryBuilder::new()
                    .serialize("from", request.from.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Shows a published post's organic counts on each channel beside what the ads that promote it did, by ad account, and its boosts. Paid numbers are part of what a platform counts on the post: the two are shown side by side, never summed. The organic side is empty for someone who may not read analytics. Needs ads:read.
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
    ///         .ads
    ///         .post_performance(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn post_performance(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<PostAdPerformance, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads/posts/{}", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Checks a boost as `createBoost` would, and says what it would commit and the room it has, without reserving or sending anything: show it before the last step. A total budget commits its amount; a daily budget commits, for each calendar week of the account's zone (Sunday to Saturday) the run touches, its amount and 75% more for each day of the run in that week, which the network may spend on any day, and never more than 7 times its amount, the most the network spends in a week. Needs ads:spend.
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
    ///         .ads
    ///         .quote_boost(
    ///             &"workspaceId".to_string(),
    ///             &NewBoost {
    ///                 account_id: "accountId".to_string(),
    ///                 audience: BoostAudience {
    ///                     age_max: 1,
    ///                     age_min: 1,
    ///                     countries: vec!["countries".to_string()],
    ///                     ..Default::default()
    ///                 },
    ///                 beneficiary: None,
    ///                 budget: BoostBudget {
    ///                     amount: 1000000,
    ///                     kind: BoostBudgetKind::Total,
    ///                 },
    ///                 channel_id: "channelId".to_string(),
    ///                 currency: "currency".to_string(),
    ///                 ends_at: "endsAt".to_string(),
    ///                 payer: None,
    ///                 post_id: "postId".to_string(),
    ///                 special_ad_category: SpecialAdCategory::None,
    ///                 starts_at: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn quote_boost(
        &self,
        workspace_id: &str,
        request: &NewBoost,
        options: Option<RequestOptions>,
    ) -> Result<BoostQuote, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/ads/boosts/quote", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists the workspace's boosts, newest first, 50 a page, those of one post with `postId`. Pass the page's `nextCursor` as `cursor` for the next one. Needs ads:read.
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
    ///         .ads
    ///         .list_boosts(
    ///             &"workspaceId".to_string(),
    ///             &ListBoostsQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_boosts(
        &self,
        workspace_id: &str,
        request: &ListBoostsQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<BoostPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads/boosts", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("postId", request.post_id.clone())
                    .build(),
                options,
            )
            .await
    }

    /// **Spends money.** Boosts a post the workspace published on a Facebook Page, or on an Instagram account connected through its Page, as an ad on Meta: it spends up to the budget, from the ad account's payment method, until `endsAt`. The `Idempotency-Key` header is required: the same key with the same request answers the boost it made, and never makes another. The boost is accepted as `requested`, its budget counted against the ceiling, and made in the background, paused, then run; read it to see how that ended. It is refused, with nothing reserved or sent, when the server offers no spending, no owner allowed the account to spend, the account or its sign-in cannot run ads, the post cannot be boosted, the boost breaks Peal's rules (an end date within 90 days is required), or the monthly ceiling or the account's own spend cap has no room. Needs ads:spend; never staff acting as a member.
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
    ///         .ads
    ///         .create_boost(
    ///             &"workspaceId".to_string(),
    ///             &NewBoost {
    ///                 account_id: "accountId".to_string(),
    ///                 audience: BoostAudience {
    ///                     age_max: 1,
    ///                     age_min: 1,
    ///                     countries: vec!["countries".to_string()],
    ///                     ..Default::default()
    ///                 },
    ///                 beneficiary: None,
    ///                 budget: BoostBudget {
    ///                     amount: 1000000,
    ///                     kind: BoostBudgetKind::Total,
    ///                 },
    ///                 channel_id: "channelId".to_string(),
    ///                 currency: "currency".to_string(),
    ///                 ends_at: "endsAt".to_string(),
    ///                 payer: None,
    ///                 post_id: "postId".to_string(),
    ///                 special_ad_category: SpecialAdCategory::None,
    ///                 starts_at: None,
    ///             },
    ///             Some(RequestOptions::new().additional_header("idempotency-key", "idempotency-key")),
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create_boost(
        &self,
        workspace_id: &str,
        request: &NewBoost,
        options: Option<RequestOptions>,
    ) -> Result<Boost, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/ads/boosts", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Shows a boost and the journal of the requests Peal sent the network for it, each with how it ended. Needs ads:read.
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
    ///         .ads
    ///         .get_boost(&"workspaceId".to_string(), &"boostId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get_boost(
        &self,
        workspace_id: &str,
        boost_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<BoostDetail, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads/boosts/{}", workspace_id, boost_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Pauses a boost that runs or may run: its campaign is told to pause, and the boost is `paused` once the network confirms. Asked twice, it is done once. Its budget stays counted against the ceiling. Needs ads:spend or ads:manage.
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
    ///         .ads
    ///         .pause_boost(&"workspaceId".to_string(), &"boostId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn pause_boost(
        &self,
        workspace_id: &str,
        boost_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Boost, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/ads/boosts/{}/pause",
                    workspace_id, boost_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// **Spends money.** Runs a paused boost again, until its end. Resuming spends, so it is checked as a new boost is: spending still allowed, the account usable, and the ceiling, as it now is, not passed by what the account's boosts commit. Needs ads:spend.
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
    ///         .ads
    ///         .resume_boost(&"workspaceId".to_string(), &"boostId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn resume_boost(
        &self,
        workspace_id: &str,
        boost_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Boost, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/ads/boosts/{}/resume",
                    workspace_id, boost_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Stops a boost for good: its campaign is told to pause, and the boost is `stopped` once the network confirms; one not yet made is never made. Asked twice, it is done once. A stopped boost does not run again. What it committed is counted down to what it can have cost: nothing if it never ran, the days it ran for a daily budget, its whole budget for a total one. Needs ads:spend or ads:manage.
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
    ///         .ads
    ///         .stop_boost(&"workspaceId".to_string(), &"boostId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn stop_boost(
        &self,
        workspace_id: &str,
        boost_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Boost, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/ads/boosts/{}/stop",
                    workspace_id, boost_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the ads audit trail, newest first, 100 a page: every decision about spending and every change to a boost, with who made it and the amounts. Kept 13 months. Answers to owners alone (ads:authorize).
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
    ///         .ads
    ///         .audit_trail(
    ///             &"workspaceId".to_string(),
    ///             &AuditTrailQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn audit_trail(
        &self,
        workspace_id: &str,
        request: &AuditTrailQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<AdAuditPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/ads/audit", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .build(),
                options,
            )
            .await
    }
}
