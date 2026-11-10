use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct WebhooksClient {
    pub http_client: HttpClient,
}

impl WebhooksClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's webhook endpoints, oldest first. Needs webhook:read.
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
    ///     client.webhooks.list(&"workspaceId".to_string(), None).await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<WebhookEndpoint>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/webhooks", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has 10 endpoints at most, whatever its plan. With `scope` `partner`, in the home workspace of a partner account, the endpoint also hears what happens in every workspace the partner owns, each event naming its workspace and carrying the partner's own id for it (`workspaceExternalId`); any other workspace answers 404 `PartnerNotFound`. Needs webhook:manage.
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
    ///         .webhooks
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &NewWebhookEndpoint {
    ///                 event_types: vec![SubscribableWebhookEventType::PostScheduled],
    ///                 url: "url".to_string(),
    ///                 description: None,
    ///                 enabled: None,
    ///                 scope: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &NewWebhookEndpoint,
        options: Option<RequestOptions>,
    ) -> Result<WebhookEndpointSecret, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/webhooks", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Shows one of the workspace's webhook endpoints. Needs webhook:read.
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
    ///         .webhooks
    ///         .get(&"workspaceId".to_string(), &"endpointId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        endpoint_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<WebhookEndpoint, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/webhooks/{}", workspace_id, endpoint_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Deletes an endpoint, its secret and its delivery log: nothing more is sent to it. Needs webhook:manage.
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
    ///         .webhooks
    ///         .delete(&"workspaceId".to_string(), &"endpointId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn delete(
        &self,
        workspace_id: &str,
        endpoint_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/webhooks/{}", workspace_id, endpoint_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Changes an endpoint's address, description or events, or turns it off or back on: what is left out stays as it is. Turned off, it is sent nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on forgets the failures that turned it off. Needs webhook:manage.
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
    ///         .webhooks
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"endpointId".to_string(),
    ///             &WebhookEndpointChange {
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
        endpoint_id: &str,
        request: &WebhookEndpointChange,
        options: Option<RequestOptions>,
    ) -> Result<WebhookEndpoint, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                &format!("api/workspaces/{}/webhooks/{}", workspace_id, endpoint_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Replaces an endpoint's signing secret, and answers with the new one, which is not shown again. For 24 hours each delivery carries two signatures, one per secret, so the receiver changes its own without missing any; the old one then signs nothing more. Needs webhook:manage.
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
    ///         .webhooks
    ///         .rotate_secret(&"workspaceId".to_string(), &"endpointId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn rotate_secret(
        &self,
        workspace_id: &str,
        endpoint_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<WebhookEndpointSecret, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/webhooks/{}/secret",
                    workspace_id, endpoint_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Sends the endpoint a `webhook.test` event, whatever it subscribes to, and answers with its delivery, still pending: read the endpoint's deliveries to see how it ended. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
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
    ///         .webhooks
    ///         .send_test(&"workspaceId".to_string(), &"endpointId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn send_test(
        &self,
        workspace_id: &str,
        endpoint_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<WebhookDelivery, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/webhooks/{}/test",
                    workspace_id, endpoint_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the endpoint's deliveries, newest first, 30 a page unless `limit` (at most 100) says otherwise: each one's status, the receiver's last answer, how many attempts were made and when the next one is. Pass the page's `nextCursor` as `cursor` for the next one. A delivery is kept 30 days. Needs webhook:read.
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
    ///         .webhooks
    ///         .list_deliveries(
    ///             &"workspaceId".to_string(),
    ///             &"endpointId".to_string(),
    ///             &ListDeliveriesQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list_deliveries(
        &self,
        workspace_id: &str,
        endpoint_id: &str,
        request: &ListDeliveriesQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<WebhookDeliveryPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!(
                    "api/workspaces/{}/webhooks/{}/deliveries",
                    workspace_id, endpoint_id
                ),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Sends the delivery's event to the endpoint again, as a new delivery of the same event: the receiver gets the same `webhook-id` and body, with a new timestamp and signature. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
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
    ///         .webhooks
    ///         .redeliver(
    ///             &"workspaceId".to_string(),
    ///             &"endpointId".to_string(),
    ///             &"deliveryId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn redeliver(
        &self,
        workspace_id: &str,
        endpoint_id: &str,
        delivery_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<WebhookDelivery, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/webhooks/{}/deliveries/{}/redeliver",
                    workspace_id, endpoint_id, delivery_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
