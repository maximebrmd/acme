pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookDelivery {
    #[serde(default)]
    pub attempts: i64,
    #[serde(rename = "completedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "durationMs")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    #[serde(rename = "endpointId")]
    #[serde(default)]
    pub endpoint_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<WebhookAttemptError>,
    #[serde(rename = "eventId")]
    #[serde(default)]
    pub event_id: String,
    #[serde(rename = "eventType")]
    pub event_type: WebhookEventType,
    #[serde(rename = "failureReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<WebhookDeliveryFailure>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "lastAttemptAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_attempt_at: Option<String>,
    #[serde(rename = "nextAttemptAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_attempt_at: Option<String>,
    #[serde(rename = "redeliveryOf")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redelivery_of: Option<String>,
    #[serde(rename = "responseExcerpt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_excerpt: Option<String>,
    #[serde(rename = "responseStatus")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_status: Option<i64>,
    pub status: WebhookDeliveryStatus,
    #[serde(rename = "workspaceExternalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_external_id: Option<String>,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl WebhookDelivery {
    pub fn builder() -> WebhookDeliveryBuilder {
        <WebhookDeliveryBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookDeliveryBuilder {
    attempts: Option<i64>,
    completed_at: Option<String>,
    created_at: Option<String>,
    duration_ms: Option<i64>,
    endpoint_id: Option<String>,
    error: Option<WebhookAttemptError>,
    event_id: Option<String>,
    event_type: Option<WebhookEventType>,
    failure_reason: Option<WebhookDeliveryFailure>,
    id: Option<String>,
    last_attempt_at: Option<String>,
    next_attempt_at: Option<String>,
    redelivery_of: Option<String>,
    response_excerpt: Option<String>,
    response_status: Option<i64>,
    status: Option<WebhookDeliveryStatus>,
    workspace_external_id: Option<String>,
    workspace_id: Option<String>,
}

impl WebhookDeliveryBuilder {
    pub fn attempts(mut self, value: i64) -> Self {
        self.attempts = Some(value);
        self
    }

    pub fn completed_at(mut self, value: impl Into<String>) -> Self {
        self.completed_at = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn duration_ms(mut self, value: i64) -> Self {
        self.duration_ms = Some(value);
        self
    }

    pub fn endpoint_id(mut self, value: impl Into<String>) -> Self {
        self.endpoint_id = Some(value.into());
        self
    }

    pub fn error(mut self, value: WebhookAttemptError) -> Self {
        self.error = Some(value);
        self
    }

    pub fn event_id(mut self, value: impl Into<String>) -> Self {
        self.event_id = Some(value.into());
        self
    }

    pub fn event_type(mut self, value: WebhookEventType) -> Self {
        self.event_type = Some(value);
        self
    }

    pub fn failure_reason(mut self, value: WebhookDeliveryFailure) -> Self {
        self.failure_reason = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn last_attempt_at(mut self, value: impl Into<String>) -> Self {
        self.last_attempt_at = Some(value.into());
        self
    }

    pub fn next_attempt_at(mut self, value: impl Into<String>) -> Self {
        self.next_attempt_at = Some(value.into());
        self
    }

    pub fn redelivery_of(mut self, value: impl Into<String>) -> Self {
        self.redelivery_of = Some(value.into());
        self
    }

    pub fn response_excerpt(mut self, value: impl Into<String>) -> Self {
        self.response_excerpt = Some(value.into());
        self
    }

    pub fn response_status(mut self, value: i64) -> Self {
        self.response_status = Some(value);
        self
    }

    pub fn status(mut self, value: WebhookDeliveryStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn workspace_external_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_external_id = Some(value.into());
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WebhookDelivery`].
    /// This method will fail if any of the following fields are not set:
    /// - [`attempts`](WebhookDeliveryBuilder::attempts)
    /// - [`created_at`](WebhookDeliveryBuilder::created_at)
    /// - [`endpoint_id`](WebhookDeliveryBuilder::endpoint_id)
    /// - [`event_id`](WebhookDeliveryBuilder::event_id)
    /// - [`event_type`](WebhookDeliveryBuilder::event_type)
    /// - [`id`](WebhookDeliveryBuilder::id)
    /// - [`status`](WebhookDeliveryBuilder::status)
    /// - [`workspace_id`](WebhookDeliveryBuilder::workspace_id)
    pub fn build(self) -> Result<WebhookDelivery, BuildError> {
        Ok(WebhookDelivery {
            attempts: self
                .attempts
                .ok_or_else(|| BuildError::missing_field("attempts"))?,
            completed_at: self.completed_at,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            duration_ms: self.duration_ms,
            endpoint_id: self
                .endpoint_id
                .ok_or_else(|| BuildError::missing_field("endpoint_id"))?,
            error: self.error,
            event_id: self
                .event_id
                .ok_or_else(|| BuildError::missing_field("event_id"))?,
            event_type: self
                .event_type
                .ok_or_else(|| BuildError::missing_field("event_type"))?,
            failure_reason: self.failure_reason,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            last_attempt_at: self.last_attempt_at,
            next_attempt_at: self.next_attempt_at,
            redelivery_of: self.redelivery_of,
            response_excerpt: self.response_excerpt,
            response_status: self.response_status,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            workspace_external_id: self.workspace_external_id,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
