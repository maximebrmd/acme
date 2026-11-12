use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct UsageClient {
    pub http_client: HttpClient,
}

impl UsageClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers what the workspace uses of its plan now, and day by day from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today): each day's posts that went out, one per channel they went out on, by platform, and its requests to the writing assistant; the channels it connected, its members and the media it stored as the daily snapshot found them shortly after each day ended, null (requests included) for a day the server took no snapshot of, today's among them; then the period's totals, with its channel-days and, for each calendar month it touches, its posts on platforms that bill the server per post, each part of a thread counted as the platform bills it (a thread is one of the day's posts). Usage is kept 400 days. Counts only: nothing here is priced or limits anything. On a server that does not bill, `plan` and `allowances` are null. Needs billing:read.
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
    ///         .usage
    ///         .get(
    ///             &"workspaceId".to_string(),
    ///             &UsageGetQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        request: &UsageGetQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<WorkspaceUsageReport, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/usage", workspace_id),
                None,
                QueryBuilder::new()
                    .serialize("from", request.from.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Answers what the partner account uses across the workspaces it holds, from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today), and per workspace. `current` is what it holds now: the workspaces it owns and the channels connected across them and its home workspace, which its plan's channel limit counts. Each day gives the workspaces it owned and the channels connected across them as the daily count found them at 23:41 UTC (null for a day without a count), and the posts that went out in the workspaces that still exist. `workspaces` is a page of its workspaces with each one's external id, the channels it connected itself now, and over the period its channel-days, posts by platform, requests to the writing assistant, latest media storage and, for each calendar month the period touches, posts on platforms that bill the server per post: newest first, 50 a page unless `limit` (at most 100) says otherwise, in the order and with the cursor of the list of the partner's workspaces (pass `next` as `before`; anything else is refused, 400); the home workspace comes first, on the first page only, one more than asked. `current`, `days` and `totals`, which cover the whole account, come with the first page only, and are null on the pages after it, which read their own workspaces alone. A workspace offboarded during the period is no longer listed, and its posts leave the sums, as its counts were erased with it; the daily `workspaces` and `channels` still count it for the days it existed. Kept 400 days. Counts only: nothing here is priced or limits anything. On a server that does not bill, `plan` and `allowances` are null. For the people of the partner's home workspace: a workspace with no partner account answers 404 `PartnerNotFound`. A partner key reads the same at `GET /api/partner/usage`. Needs partner:read.
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
    ///         .usage
    ///         .partner(
    ///             &"workspaceId".to_string(),
    ///             &PartnerQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn partner(
        &self,
        workspace_id: &str,
        request: &PartnerQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<PartnerUsageReport, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/usage/partner", workspace_id),
                None,
                QueryBuilder::new()
                    .string("before", request.before.clone())
                    .serialize("from", request.from.clone())
                    .string("limit", request.limit.clone())
                    .serialize("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }
}
