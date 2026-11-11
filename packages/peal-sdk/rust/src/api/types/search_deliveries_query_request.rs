pub use crate::prelude::*;

/// Query parameters for searchDeliveries
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SearchDeliveriesQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(rename = "eventType")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_type: Option<WebhookEventType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<WebhookDeliveryStatus>,
    #[serde(rename = "endpointId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub since: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<String>,
}

impl SearchDeliveriesQueryRequest {
    pub fn builder() -> SearchDeliveriesQueryRequestBuilder {
        <SearchDeliveriesQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SearchDeliveriesQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
    event_type: Option<WebhookEventType>,
    status: Option<WebhookDeliveryStatus>,
    endpoint_id: Option<String>,
    since: Option<String>,
    until: Option<String>,
}

impl SearchDeliveriesQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn event_type(mut self, value: WebhookEventType) -> Self {
        self.event_type = Some(value);
        self
    }

    pub fn status(mut self, value: WebhookDeliveryStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn endpoint_id(mut self, value: impl Into<String>) -> Self {
        self.endpoint_id = Some(value.into());
        self
    }

    pub fn since(mut self, value: impl Into<String>) -> Self {
        self.since = Some(value.into());
        self
    }

    pub fn until(mut self, value: impl Into<String>) -> Self {
        self.until = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SearchDeliveriesQueryRequest`].
    pub fn build(self) -> Result<SearchDeliveriesQueryRequest, BuildError> {
        Ok(SearchDeliveriesQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
            event_type: self.event_type,
            status: self.status,
            endpoint_id: self.endpoint_id,
            since: self.since,
            until: self.until,
        })
    }
}
