use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct PostsClient {
    pub http_client: HttpClient,
}

impl PostsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
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
    ///         .posts
    ///         .drafts(
    ///             &"workspaceId".to_string(),
    ///             &DraftsQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn drafts(
        &self,
        workspace_id: &str,
        request: &DraftsQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<DraftPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/drafts", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.
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
    ///         .posts
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &PostsListQueryRequest {
    ///                 from: "from".to_string(),
    ///                 to: "to".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        request: &PostsListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<Vec<Post>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts", workspace_id),
                None,
                QueryBuilder::new()
                    .string("from", request.from.clone())
                    .string("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.
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
    ///         .posts
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &PostDraft {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 content: PostContent {
    ///                     media: vec![MediaAttachment {
    ///                         alt_text: "altText".to_string(),
    ///                         media_id: "mediaId".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     overrides: vec![TextOverride {
    ///                         channel_id: "channelId".to_string(),
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     text: "text".to_string(),
    ///                     ..Default::default()
    ///                 },
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
        request: &PostDraft,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Answers with a post of the workspace. Needs post:read.
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
    ///         .posts
    ///         .get(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.
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
    ///         .posts
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &PostDraft {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 content: PostContent {
    ///                     media: vec![MediaAttachment {
    ///                         alt_text: "altText".to_string(),
    ///                         media_id: "mediaId".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     overrides: vec![TextOverride {
    ///                         channel_id: "channelId".to_string(),
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     text: "text".to_string(),
    ///                     ..Default::default()
    ///                 },
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
        post_id: &str,
        request: &PostDraft,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!("api/workspaces/{}/posts/{}", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.
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
    ///         .posts
    ///         .discard(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn discard(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/posts/{}", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.
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
    ///         .posts
    ///         .attempts(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn attempts(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<PublicationAttempt>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}/attempts", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.
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
    ///         .posts
    ///         .schedule(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &SchedulePost {
    ///                 at: "at".to_string(),
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 time_zone: "timeZone".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn schedule(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &SchedulePost,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/schedule", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.
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
    ///         .posts
    ///         .reschedule(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &PostSchedule {
    ///                 at: "at".to_string(),
    ///                 time_zone: "timeZone".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn reschedule(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &PostSchedule,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/reschedule",
                    workspace_id, post_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.
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
    ///         .posts
    ///         .unschedule(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn unschedule(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/unschedule",
                    workspace_id, post_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.
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
    ///         .posts
    ///         .repost(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"targetId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn repost(
        &self,
        workspace_id: &str,
        post_id: &str,
        target_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/targets/{}/repost",
                    workspace_id, post_id, target_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.
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
    ///         .posts
    ///         .confirm(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"targetId".to_string(),
    ///             &TargetConfirmation::Published {
    ///                 data: TargetConfirmationPublished {
    ///                     permalink: None,
    ///                     ..Default::default()
    ///                 },
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn confirm(
        &self,
        workspace_id: &str,
        post_id: &str,
        target_id: &str,
        request: &TargetConfirmation,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/targets/{}/confirm",
                    workspace_id, post_id, target_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.
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
    ///         .posts
    ///         .cancel(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn cancel(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/cancel", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }
}
