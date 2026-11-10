pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookEndpoint {
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub description: String,
    #[serde(rename = "disabledAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_at: Option<String>,
    #[serde(rename = "disabledReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_reason: Option<WebhookDisabledReason>,
    #[serde(default)]
    pub enabled: bool,
    #[serde(rename = "eventTypes")]
    #[serde(default)]
    pub event_types: Vec<SubscribableWebhookEventType>,
    #[serde(rename = "failingSince")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failing_since: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "previousSecretExpiresAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_secret_expires_at: Option<String>,
    pub scope: WebhookEndpointScope,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
    #[serde(default)]
    pub url: String,
}

impl WebhookEndpoint {
    pub fn builder() -> WebhookEndpointBuilder {
        <WebhookEndpointBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookEndpointBuilder {
    created_at: Option<String>,
    description: Option<String>,
    disabled_at: Option<String>,
    disabled_reason: Option<WebhookDisabledReason>,
    enabled: Option<bool>,
    event_types: Option<Vec<SubscribableWebhookEventType>>,
    failing_since: Option<String>,
    id: Option<String>,
    previous_secret_expires_at: Option<String>,
    scope: Option<WebhookEndpointScope>,
    updated_at: Option<String>,
    url: Option<String>,
}

impl WebhookEndpointBuilder {
    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn description(mut self, value: impl Into<String>) -> Self {
        self.description = Some(value.into());
        self
    }

    pub fn disabled_at(mut self, value: impl Into<String>) -> Self {
        self.disabled_at = Some(value.into());
        self
    }

    pub fn disabled_reason(mut self, value: WebhookDisabledReason) -> Self {
        self.disabled_reason = Some(value);
        self
    }

    pub fn enabled(mut self, value: bool) -> Self {
        self.enabled = Some(value);
        self
    }

    pub fn event_types(mut self, value: Vec<SubscribableWebhookEventType>) -> Self {
        self.event_types = Some(value);
        self
    }

    pub fn failing_since(mut self, value: impl Into<String>) -> Self {
        self.failing_since = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn previous_secret_expires_at(mut self, value: impl Into<String>) -> Self {
        self.previous_secret_expires_at = Some(value.into());
        self
    }

    pub fn scope(mut self, value: WebhookEndpointScope) -> Self {
        self.scope = Some(value);
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WebhookEndpoint`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](WebhookEndpointBuilder::created_at)
    /// - [`description`](WebhookEndpointBuilder::description)
    /// - [`enabled`](WebhookEndpointBuilder::enabled)
    /// - [`event_types`](WebhookEndpointBuilder::event_types)
    /// - [`id`](WebhookEndpointBuilder::id)
    /// - [`scope`](WebhookEndpointBuilder::scope)
    /// - [`updated_at`](WebhookEndpointBuilder::updated_at)
    /// - [`url`](WebhookEndpointBuilder::url)
    pub fn build(self) -> Result<WebhookEndpoint, BuildError> {
        Ok(WebhookEndpoint {
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            description: self
                .description
                .ok_or_else(|| BuildError::missing_field("description"))?,
            disabled_at: self.disabled_at,
            disabled_reason: self.disabled_reason,
            enabled: self
                .enabled
                .ok_or_else(|| BuildError::missing_field("enabled"))?,
            event_types: self
                .event_types
                .ok_or_else(|| BuildError::missing_field("event_types"))?,
            failing_since: self.failing_since,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            previous_secret_expires_at: self.previous_secret_expires_at,
            scope: self
                .scope
                .ok_or_else(|| BuildError::missing_field("scope"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
