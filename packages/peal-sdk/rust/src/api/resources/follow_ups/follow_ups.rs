use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct FollowUpsClient {
    pub http_client: HttpClient,
}

impl FollowUpsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's follow-up rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those of the post `postId` or with `status` alone when given, each with what its channels can carry and its latest 20 follow-ups. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
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
    ///         .follow_ups
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &FollowUpsListQueryRequest {
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
        request: &FollowUpsListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<FollowUpRulePage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/follow-ups", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .string("postId", request.post_id.clone())
                    .serialize("status", request.status.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Starts a rule on a post (`postId`) or on every post a channel publishes from now on (`channelId`), exactly one of them, that waits for `likes` likes (1 to 1,000,000) and then publishes `comment`, reposts (`repost`), or both. A rule acts on the workspace's own posts only, from the channel's own account: once a post it acts on has `likes` likes on a channel, as analytics last counted them (hourly for two days, then daily: a rule never asks a platform for more, nor makes a paid read happen), it publishes its `comment` under the post, as the account's own reply after the post's last part, and reposts it when `repost` is set, once each, within 7 days of the post going live there. A post is followed up once of each kind whatever rules act on it, and a channel carries 10 follow-ups a UTC day at most: those past it wait for the next day, within their window. Comments go out on Bluesky, Mastodon and X (a post X bills, and only where the server sends X threads), reposts on Bluesky (a channel connected before Peal asked for it must be connected again) and Mastodon; LinkedIn's terms forbid both, and elsewhere `channels` says why not. Nothing likes, follows or messages anyone. It acts as whoever started it, with what they may do then: where the approval policy holds their posts it waits for a member who approves posts to approve it, and it ends when they can no longer publish. What each did is in `followUps`. A post that already went out is armed at once, while its window lasts. It is refused when no channel it acts on can carry what it asks, or when its comment is longer than a channel that could carry it takes (FollowUpNotPossible, with each channel's reasons). A post or a channel has one rule going on at a time (FollowUpRuleTaken), and a workspace 100 active or paused. It publishes again, in public, without anyone being asked each time. Needs post:schedule, or post:create where posts wait for an approval; never staff acting as a member.
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
    ///         .follow_ups
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &NewFollowUpRule {
    ///                 likes: 1,
    ///                 channel_id: None,
    ///                 comment: None,
    ///                 post_id: None,
    ///                 repost: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &NewFollowUpRule,
        options: Option<RequestOptions>,
    ) -> Result<FollowUpRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/follow-ups", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Answers with a rule of the workspace, what its channels can carry and its latest 20 follow-ups. Needs post:read.
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
    ///         .follow_ups
    ///         .get(&"workspaceId".to_string(), &"ruleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        rule_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<FollowUpRule, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/follow-ups/{}", workspace_id, rule_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Stops a rule: it ends `stopped`, what it armed and did not send is given up, and what it sent stays on the platforms. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter acting as they started it.
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
    ///         .follow_ups
    ///         .delete(&"workspaceId".to_string(), &"ruleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn delete(
        &self,
        workspace_id: &str,
        rule_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/follow-ups/{}", workspace_id, rule_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Changes a rule's `likes`, its `comment` (null takes it away) or whether it reposts, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A follow-up that went out stays as it is; one armed sends what the rule says when it goes. Where the approval policy holds the posts of whoever changes what the rule sends, it waits for an approval again. A paused rule sends nothing, and what it armed expires with its window. An ended rule changes no more (FollowUpRuleEnded). Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.
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
    ///         .follow_ups
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"ruleId".to_string(),
    ///             &FollowUpRuleChange {
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
        rule_id: &str,
        request: &FollowUpRuleChange,
        options: Option<RequestOptions>,
    ) -> Result<FollowUpRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/follow-ups/{}", workspace_id, rule_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Approves what a rule sends, for a rule whose starter's posts wait for an approval: it then acts as it is. A rule approved, or that needs no approval, is answered as it is. Needs post:approve, in person: an API key or an application never approves.
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
    ///         .follow_ups
    ///         .approve(&"workspaceId".to_string(), &"ruleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn approve(
        &self,
        workspace_id: &str,
        rule_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<FollowUpRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/follow-ups/{}/approve",
                    workspace_id, rule_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
