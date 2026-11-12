use crate::api::*;
use crate::{ApiError, ByteStream, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
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

    /// Answers a workspace's analytics over a range in one call: the totals of the posts published in it and of those published in the range before, of the same length, so a client shows the trend; followers at the end of each and their change; the same by channel and by platform; each day's gains, followers and account views; and the `topPosts` (5 unless said, 25 at most) with the most engagement. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. Followers are kept from the day a channel is connected, read once a day; a number a platform does not give is null, never zero. Needs analytics:read.
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
    ///         .dashboard(
    ///             &"workspaceId".to_string(),
    ///             &DashboardQueryRequest {
    ///                 time_zone: "timeZone".to_string(),
    ///                 days: None,
    ///                 from: None,
    ///                 to: None,
    ///                 top_posts: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn dashboard(
        &self,
        workspace_id: &str,
        request: &DashboardQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<AnalyticsDashboard, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/analytics/dashboard", workspace_id),
                None,
                QueryBuilder::new()
                    .string("days", request.days.clone())
                    .serialize("from", request.from.clone())
                    .string("timeZone", request.time_zone.clone())
                    .serialize("to", request.to.clone())
                    .string("topPosts", request.top_posts.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Answers one channel's numbers day by day: its followers, the accounts it follows and its posts as read each UTC day, the views and reach its platform counted, and what its posts published in the range gained. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. A channel Peal has read nothing of answers days without numbers. Needs analytics:read.
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
    ///         .channel(
    ///             &"workspaceId".to_string(),
    ///             &"channelId".to_string(),
    ///             &ChannelQueryRequest {
    ///                 time_zone: "timeZone".to_string(),
    ///                 days: None,
    ///                 from: None,
    ///                 to: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn channel(
        &self,
        workspace_id: &str,
        channel_id: &str,
        request: &ChannelQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ChannelSeries, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/analytics/channels/{}",
                    workspace_id, channel_id
                ),
                None,
                QueryBuilder::new()
                    .string("days", request.days.clone())
                    .serialize("from", request.from.clone())
                    .string("timeZone", request.time_zone.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Streams the workspace's analytics as a file: `kind=posts` lists each post published in the range on each channel with its latest counts, `kind=accounts` each channel's account day by day. `format=csv` (the default) writes a header line then one line a row, as RFC 4180; `format=json` writes one JSON object a line (`application/x-ndjson`). A number a platform does not give is empty in CSV and null in JSON. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. Needs analytics:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// Streaming file download (use .into_bytes() to collect or stream chunks)
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
    ///         .export(
    ///             &"workspaceId".to_string(),
    ///             &ExportQueryRequest {
    ///                 time_zone: "timeZone".to_string(),
    ///                 kind: AnalyticsExportKind::Posts,
    ///                 days: None,
    ///                 from: None,
    ///                 to: None,
    ///                 format: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn export(
        &self,
        workspace_id: &str,
        request: &ExportQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ByteStream, ApiError> {
        self.http_client
            .execute_stream_request(
                Method::GET,
                &format!("api/workspaces/{}/analytics/export", workspace_id),
                None,
                QueryBuilder::new()
                    .string("days", request.days.clone())
                    .serialize("from", request.from.clone())
                    .string("timeZone", request.time_zone.clone())
                    .serialize("to", request.to.clone())
                    .serialize("format", request.format.clone())
                    .serialize("kind", Some(request.kind.clone()))
                    .build(),
                options,
            )
            .await
    }

    /// Answers when one channel's posts did best, by weekday and hour as `timeZone` (an IANA zone) runs them, over the last `days` (30, 90 or 180, 90 unless given; fewer where the platform lets Peal keep less): for each hour, how many of its posts went live in it and the median of what each was given, likes, reposts, replies and quotes together, those the platform gives (`counted` is false where it gives none). It describes this channel's past and predicts nothing: counts of different platforms are never added, an hour with fewer than 3 posts has no median, and a channel with fewer than 20 posts in the range answers `enough: false` with no ranking. `best` lists at most 5 hours, by median then by posts. Posts younger than 48 hours are left out (`recent`), as are posts Peal deleted from the platform. Needs analytics:read.
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
    ///         .best_times(
    ///             &"workspaceId".to_string(),
    ///             &BestTimesQueryRequest {
    ///                 channel_id: "channelId".to_string(),
    ///                 time_zone: "timeZone".to_string(),
    ///                 days: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn best_times(
        &self,
        workspace_id: &str,
        request: &BestTimesQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<BestTimes, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/analytics/best-times", workspace_id),
                None,
                QueryBuilder::new()
                    .string("channelId", request.channel_id.clone())
                    .string("days", request.days.clone())
                    .string("timeZone", request.time_zone.clone())
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
