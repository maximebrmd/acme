use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct ArticlesClient {
    pub http_client: HttpClient,
}

impl ArticlesClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's articles, newest first, 50 a page unless `limit` (at most 100) says otherwise, those in one `status` when it is given. Pass the page's `nextCursor` as `cursor` for the next. Needs post:read.
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
    ///         .articles
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &ArticlesListQueryRequest {
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
        request: &ArticlesListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ArticlePage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/articles", workspace_id),
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

    /// Writes an article for one of the workspace's websites (a channel connected with connectSite): a draft, or scheduled at once with `schedule`. A scheduled article is checked as the site would take it (ArticleRejected lists every violation); its images are files of the workspace's library, ready (UnknownMedia otherwise), the cover an image. Needs post:create, and post:schedule with `schedule`.
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
    ///         .articles
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &NewArticle {
    ///                 body: ArticleBody {
    ///                     content: vec![],
    ///                     r#type: ArticleBodyType::Doc,
    ///                 },
    ///                 title: "title".to_string(),
    ///                 channel_id: "channelId".to_string(),
    ///                 categories: None,
    ///                 cover_media_id: None,
    ///                 excerpt: None,
    ///                 site_status: None,
    ///                 tags: None,
    ///                 schedule: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &NewArticle,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/articles", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Reads an article. Needs post:read.
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
    ///         .articles
    ///         .get(&"workspaceId".to_string(), &"articleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        article_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/articles/{}", workspace_id, article_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Deletes the article from Peal, and its job when it waits to go out; never while it is being sent. A post already on the site stays there: unpublish it first. Needs post:delete.
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
    ///         .articles
    ///         .delete(&"workspaceId".to_string(), &"articleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn delete(
        &self,
        workspace_id: &str,
        article_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/articles/{}", workspace_id, article_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Replaces what a draft, a scheduled article or one that failed says. A scheduled article is checked again and keeps its time. Once on the site, use updateOnSite. Needs post:update.
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
    ///         .articles
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"articleId".to_string(),
    ///             &ArticleInput {
    ///                 body: ArticleBody {
    ///                     content: vec![],
    ///                     r#type: ArticleBodyType::Doc,
    ///                 },
    ///                 categories: None,
    ///                 cover_media_id: None,
    ///                 excerpt: None,
    ///                 site_status: None,
    ///                 tags: None,
    ///                 title: "title".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update(
        &self,
        workspace_id: &str,
        article_id: &str,
        request: &ArticleInput,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/articles/{}", workspace_id, article_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Schedules a draft, moves a scheduled article, or schedules one that failed again: Peal sends it at `at`, or now without it, and the site makes it what `siteStatus` says. With `future`, the site publishes it at `at`, which must be ahead, and Peal sends it at once. Everything is checked as the site would take it. What goes out is public, and cannot be taken back from Peal but by unpublishing it. Needs post:schedule.
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
    ///         .articles
    ///         .schedule(
    ///             &"workspaceId".to_string(),
    ///             &"articleId".to_string(),
    ///             &ArticleTime {
    ///                 time_zone: "timeZone".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn schedule(
        &self,
        workspace_id: &str,
        article_id: &str,
        request: &ArticleTime,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/articles/{}/schedule",
                    workspace_id, article_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Takes a scheduled article back to draft: nothing is sent. Needs post:schedule.
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
    ///         .articles
    ///         .unschedule(&"workspaceId".to_string(), &"articleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn unschedule(
        &self,
        workspace_id: &str,
        article_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/articles/{}/unschedule",
                    workspace_id, article_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Sends a failed article again now, or one that was unconfirmed once a member checked it is not on the site: Peal never sends an unconfirmed article again on its own. Needs post:schedule.
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
    ///         .articles
    ///         .retry(&"workspaceId".to_string(), &"articleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn retry(
        &self,
        workspace_id: &str,
        article_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/articles/{}/retry",
                    workspace_id, article_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Moves the article's post to the site's trash, where the site keeps it for a while (30 days by default on WordPress) before deleting it; it stays published in Peal, with `removedAt`. Needs post:publish; an OAuth client needs the scope workspace:publish.
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
    ///         .articles
    ///         .unpublish(&"workspaceId".to_string(), &"articleId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn unpublish(
        &self,
        workspace_id: &str,
        article_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/articles/{}/unpublish",
                    workspace_id, article_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Replaces what the article's post says on the site (title, body, excerpt, tags, categories, cover), at once: the site keeps its status and its date. Its files are sent again. Needs post:publish; an OAuth client needs the scope workspace:publish.
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
    ///         .articles
    ///         .update_on_site(
    ///             &"workspaceId".to_string(),
    ///             &"articleId".to_string(),
    ///             &ArticleInput {
    ///                 body: ArticleBody {
    ///                     content: vec![],
    ///                     r#type: ArticleBodyType::Doc,
    ///                 },
    ///                 categories: None,
    ///                 cover_media_id: None,
    ///                 excerpt: None,
    ///                 site_status: None,
    ///                 tags: None,
    ///                 title: "title".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update_on_site(
        &self,
        workspace_id: &str,
        article_id: &str,
        request: &ArticleInput,
        options: Option<RequestOptions>,
    ) -> Result<Article, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/articles/{}/site",
                    workspace_id, article_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }
}
