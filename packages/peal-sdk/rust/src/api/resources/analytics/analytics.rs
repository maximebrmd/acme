use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct AnalyticsClient {
    pub http_client: HttpClient,
}

impl AnalyticsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.
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
    ///         .analytics
    ///         .summary(
    ///             &"workspaceId".to_string(),
    ///             &SummaryQueryRequest {
    ///                 from: CalendarDay("from".to_string()),
    ///                 time_zone: "timeZone".to_string(),
    ///                 to: CalendarDay("to".to_string()),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn summary(
        &self,
        workspace_id: &str,
        request: &SummaryQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<AnalyticsSummary, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/analytics/summary", workspace_id),
                None,
                QueryBuilder::new()
                    .serialize("from", Some(request.from.clone()))
                    .string("timeZone", request.time_zone.clone())
                    .serialize("to", Some(request.to.clone()))
                    .build(),
                options,
            )
            .await
    }

    /// Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.
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
    ///         .analytics
    ///         .post(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn post(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<PostAnalytics, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/analytics/posts/{}",
                    workspace_id, post_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
