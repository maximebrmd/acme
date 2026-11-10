use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct ReviewClient {
    pub http_client: HttpClient,
}

impl ReviewClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers with the workspace's approval policy: which of its posts wait for an approval before they are scheduled. Needs post:read.
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
    ///         .review
    ///         .settings(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn settings(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ReviewSettings, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/review/settings", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Chooses the workspace's approval policy. It applies to posts scheduled from then on: a post already scheduled stays scheduled, and one that waits still waits. Needs organization:update, and is refused to staff acting as a member.
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
    ///         .review
    ///         .update_settings(
    ///             &"workspaceId".to_string(),
    ///             &ReviewSettings {
    ///                 approval_policy: ApprovalPolicy::Never,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update_settings(
        &self,
        workspace_id: &str,
        request: &ReviewSettings,
        options: Option<RequestOptions>,
    ) -> Result<ReviewSettings, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!("api/workspaces/{}/review/settings", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists the approvals that wait in the workspace, oldest first, 100 at most. Needs post:read.
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
    ///         .review
    ///         .pending(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn pending(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<ApprovalRequest>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/approvals", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Answers with a post's review: its comments, oldest first, and the approvals asked for it and what was decided, newest first. Needs post:read.
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
    ///         .review
    ///         .thread(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn thread(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<PostReview, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}/review", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Comments on a post, starts a thread about one of its channels or some words of its text there, or answers a thread. The text is kept as plain text, 2000 characters at most, without control characters. Those who follow the post are told. Needs post:create or post:approve.
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
    ///         .review
    ///         .comment(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &NewComment {
    ///                 text: "text".to_string(),
    ///                 anchor: None,
    ///                 parent_id: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn comment(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &NewComment,
        options: Option<RequestOptions>,
    ) -> Result<ReviewComment, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/comments", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Resolves the thread a comment started, or reopens it. An answer is not resolved: its thread is (CommentInvalid, `parent`). Needs post:create or post:approve.
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
    ///         .review
    ///         .resolve(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"commentId".to_string(),
    ///             &ResolveReviewRequest { resolved: true },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn resolve(
        &self,
        workspace_id: &str,
        post_id: &str,
        comment_id: &str,
        request: &ResolveReviewRequest,
        options: Option<RequestOptions>,
    ) -> Result<ReviewComment, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!(
                    "api/workspaces/{}/posts/{}/comments/{}",
                    workspace_id, post_id, comment_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Approves a post that waits for an approval: it is scheduled for the time it was asked for, and its job starts. Approved after that time (beyond a minute), nothing is published late: the post goes back to draft, still approved, and `late` is true; scheduling it again needs no new approval while it says the same. Recorded with who approved and when. Needs post:approve, and is refused to staff acting as a member.
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
    ///         .review
    ///         .approve(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn approve(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ApprovalOutcome, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/approve", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Sends a post that waits for an approval back to draft, with a comment that says what to change. Its author and whoever asked are told. Needs post:approve, and is refused to staff acting as a member.
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
    ///         .review
    ///         .request_changes(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &ChangesRequest {
    ///                 comment: "comment".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn request_changes(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &ChangesRequest,
        options: Option<RequestOptions>,
    ) -> Result<ChangesOutcome, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/request-changes",
                    workspace_id, post_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists a post's review links, newest first, ended ones included. No token is shown: a link's address is told once, when it is made. Needs post:read.
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
    ///         .review
    ///         .links(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn links(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<ReviewLink>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/posts/{}/review-links",
                    workspace_id, post_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Makes a link that shows a draft, a post that waits for an approval or a scheduled post to whoever holds it, without an account: the post as each channel will receive it, and nothing else of the workspace. It lets them view, comment, or approve, and works 14 days unless `expiresInHours` says otherwise (90 days at most), until it is revoked, or the post is published, cancelled or deleted. A post has 20 working links at most. The answer holds the link's address, which is not shown again. Needs post:approve, and is refused to staff acting as a member.
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
    ///         .review
    ///         .create_link(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &NewReviewLink {
    ///                 access: ReviewLinkAccess::View,
    ///                 expires_in_hours: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create_link(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &NewReviewLink,
        options: Option<RequestOptions>,
    ) -> Result<CreatedReviewLink, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/review-links",
                    workspace_id, post_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Ends a review link at once: whoever opens it is told it was revoked. Needs post:approve, and is refused to staff acting as a member.
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
    ///         .review
    ///         .revoke_link(&"workspaceId".to_string(), &"linkId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn revoke_link(
        &self,
        workspace_id: &str,
        link_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<ReviewLink, ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/review-links/{}", workspace_id, link_id),
                None,
                None,
                options,
            )
            .await
    }
}
