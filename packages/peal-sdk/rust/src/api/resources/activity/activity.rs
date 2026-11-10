use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct ActivityClient {
    pub http_client: HttpClient,
}

impl ActivityClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the requests that asked to change something in the workspace, newest first, 30 a page unless `limit` (at most 100) says otherwise: who asked (a member or an API key), how they authenticated, the key or the application it came through, the operation, the ids its path named, the status answered and, when it was refused or failed, the error's code. What the web app's settings change through the sign-in service's routes (roles, members, invitations, the subscription) is kept as `auth:` and the route's path. Requests that only read are not kept, and neither is anything a request or its answer carried. `operation` keeps one operation (`posts.schedule`), `actor` what one member (a user id) or one API key (its id) asked for. Pass the page's `nextCursor` as `cursor` for the next one. An event is kept 90 days. Needs activity:read, which owners hold.
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
    ///         .activity
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &ActivityListQueryRequest {
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
        request: &ActivityListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<ActivityPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/activity", workspace_id),
                None,
                QueryBuilder::new()
                    .string("actor", request.actor.clone())
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .string("operation", request.operation.clone())
                    .build(),
                options,
            )
            .await
    }
}
