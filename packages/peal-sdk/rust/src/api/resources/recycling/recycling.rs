use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct RecyclingClient {
    pub http_client: HttpClient,
}

impl RecyclingClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's recycling rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those with `status` alone when given, each with its next 3 posts to come. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
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
    ///         .recycling
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &RecyclingListQueryRequest {
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
        request: &RecyclingListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<RecyclingRulePage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/recycling", workspace_id),
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

    /// Starts a rule that repeats a post that is scheduled, publishing or went out (deleted from a platform since or not): `every` 1 to 365 days, 1 to 52 weeks or 1 to 12 months, until `count` posts in all (2 to 100, the source counted) or until the day `until`, and never more than 100; with up to 10 text `variants`, each checked as the source saying it would be, and optionally on a queue. Each post a rule makes is a new post, copied from the source with what the workspace still has (its channels still connected, its media, the options on them, its tags; never a signature or a default added since), and sent as any post is: the same checks, the approval policy, the month's room in the plan, its own job, outcome and notices. It says the source's text, then each variant in turn, then the source's again. The next post is made once the latest one's time has passed, one interval after the one before at the same wall-clock time in the source's zone (a month shorter than the day takes its last day), or on the queue's first free slot from then; a time missed while nothing ran is skipped, never made up for. Each acts as whoever started the rule, with what they may do when it is made: a member removed, a key revoked or an application whose grant no longer publishes ends it. A post has one rule going on at a time, and a workspace 100 active or paused. It publishes again, in public, without anyone being asked each time, unless the approval policy holds the starter's posts: then each waits for an approval. Needs post:schedule, or post:create where posts wait for an approval; never staff acting as a member.
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
    ///         .recycling
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &NewRecyclingRule {
    ///                 every: RecyclingInterval {
    ///                     count: 1,
    ///                     unit: RecyclingUnit::Days,
    ///                 },
    ///                 post_id: "postId".to_string(),
    ///                 count: None,
    ///                 queue_id: None,
    ///                 until: None,
    ///                 variants: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &NewRecyclingRule,
        options: Option<RequestOptions>,
    ) -> Result<RecyclingRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/recycling", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Answers with a rule of the workspace and its next 3 posts to come, each with the variant it will say. Needs post:read.
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
    ///         .recycling
    ///         .get(&"workspaceId".to_string(), &"ruleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        rule_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<RecyclingRule, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/recycling/{}", workspace_id, rule_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Stops a rule: it makes no more posts and ends `stopped`; the posts it made stay as they are, scheduled ones included. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter.
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
    ///         .recycling
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
                &format!("api/workspaces/{}/recycling/{}", workspace_id, rule_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Changes a rule's variants, its `count` or `until` (null takes it away), or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A post already made keeps what it says. An ended rule changes no more (RecyclingRuleEnded): resume it. Needs post:schedule, or to be the rule's starter.
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
    ///         .recycling
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"ruleId".to_string(),
    ///             &RecyclingRuleChange {
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
        request: &RecyclingRuleChange,
        options: Option<RequestOptions>,
    ) -> Result<RecyclingRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/recycling/{}", workspace_id, rule_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Sets a paused rule going again, or one that ended for a reason that can be put right (`planLimit`, `contentRejected`, `noChannels`, `queueFull`), with other `variants` if given: its next post is due at the first due instant after now. Any other ended rule is RecyclingRuleEnded. Needs post:schedule, or to be the rule's starter.
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
    ///         .recycling
    ///         .resume(
    ///             &"workspaceId".to_string(),
    ///             &"ruleId".to_string(),
    ///             &RecyclingResume {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn resume(
        &self,
        workspace_id: &str,
        rule_id: &str,
        request: &RecyclingResume,
        options: Option<RequestOptions>,
    ) -> Result<RecyclingRule, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/recycling/{}/resume",
                    workspace_id, rule_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }
}
