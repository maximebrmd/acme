use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct InboxRulesClient {
    pub http_client: HttpClient,
}

impl InboxRulesClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's comment rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those with `status` alone when given, each with what its channels can carry and the latest 20 comments it matched. Needs engagement:read.
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
    ///         .inbox_rules
    ///         .list_comment_rules(
    ///             &"workspaceId".to_string(),
    ///             &ListCommentRulesQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_comment_rules(
        &self,
        workspace_id: &str,
        request: &ListCommentRulesQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<CommentRulePage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/inbox/rules", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .serialize("status", request.status.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Starts a rule on the comments of a post that went out (`postId`) or of every post of a channel (`channelId`), exactly one of them, with 1 to 10 `keywords` and a `reply`. A rule answers, by itself and in public, as the channel's account, a comment written after it started or was last set going again, under a post it answers on (a post's rule acts on the channels the post is for, scheduled or out), that holds one of its keywords as a word (whatever its case and accents): with its `reply`, once a comment and once a person, 25 replies a day at most, and 100 a day for every rule of a channel together, through the inbox's own replies (their journal, one reply a comment, each one of the billing account's outbound messages). It answers on Mastodon, and on Facebook Pages and Instagram where the server reads their comments; Bluesky's, X's, LinkedIn's and YouTube's rules forbid an app to answer by itself, and `channels` says so. It never likes, follows or messages anyone privately. It acts as whoever started it, with what they may do then: it ends when they can no longer answer comments, and when its channel is disconnected. It is refused when no channel it answers on can carry its reply (CommentRuleNotPossible, with each channel's reason). A workspace keeps 100 rules active or paused. Needs engagement:reply; never staff acting as a member.
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
    ///         .inbox_rules
    ///         .create_comment_rule(
    ///             &"workspaceId".to_string(),
    ///             &NewCommentRule {
    ///                 keywords: vec!["keywords".to_string()],
    ///                 reply: "reply".to_string(),
    ///                 channel_id: None,
    ///                 post_id: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create_comment_rule(
        &self,
        workspace_id: &str,
        request: &NewCommentRule,
        options: Option<RequestOptions>,
    ) -> Result<CommentRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/inbox/rules", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Answers a comment rule of the workspace, what its channels can carry and what it matched. Needs engagement:read.
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
    ///         .inbox_rules
    ///         .get_comment_rule(&"workspaceId".to_string(), &"ruleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get_comment_rule(
        &self,
        workspace_id: &str,
        rule_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<CommentRule, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/inbox/rules/{}", workspace_id, rule_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Stops a rule: it answers nothing more; the replies it sent stay, and the inbox withdraws one as any other. Needs engagement:reply.
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
    ///         .inbox_rules
    ///         .delete_comment_rule(&"workspaceId".to_string(), &"ruleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn delete_comment_rule(
        &self,
        workspace_id: &str,
        rule_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/inbox/rules/{}", workspace_id, rule_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Changes a rule's keywords or reply, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A paused rule looks at nothing, and answers no comment received while it was paused. An ended rule changes no more (CommentRuleEnded). Needs engagement:reply.
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
    ///         .inbox_rules
    ///         .update_comment_rule(
    ///             &"workspaceId".to_string(),
    ///             &"ruleId".to_string(),
    ///             &CommentRuleChange {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update_comment_rule(
        &self,
        workspace_id: &str,
        rule_id: &str,
        request: &CommentRuleChange,
        options: Option<RequestOptions>,
    ) -> Result<CommentRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/inbox/rules/{}", workspace_id, rule_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }
}
