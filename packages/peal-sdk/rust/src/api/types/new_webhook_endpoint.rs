pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewWebhookEndpoint {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(rename = "eventTypes")]
    #[serde(default)]
    pub event_types: Vec<SubscribableWebhookEventType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<WebhookEndpointScope>,
    #[serde(default)]
    pub url: String,
}

impl NewWebhookEndpoint {
    pub fn builder() -> NewWebhookEndpointBuilder {
        <NewWebhookEndpointBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewWebhookEndpointBuilder {
    description: Option<String>,
    enabled: Option<bool>,
    event_types: Option<Vec<SubscribableWebhookEventType>>,
    scope: Option<WebhookEndpointScope>,
    url: Option<String>,
}

impl NewWebhookEndpointBuilder {
    pub fn description(mut self, value: impl Into<String>) -> Self {
        self.description = Some(value.into());
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

    pub fn scope(mut self, value: WebhookEndpointScope) -> Self {
        self.scope = Some(value);
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewWebhookEndpoint`].
    /// This method will fail if any of the following fields are not set:
    /// - [`event_types`](NewWebhookEndpointBuilder::event_types)
    /// - [`url`](NewWebhookEndpointBuilder::url)
    pub fn build(self) -> Result<NewWebhookEndpoint, BuildError> {
        Ok(NewWebhookEndpoint {
            description: self.description,
            enabled: self.enabled,
            event_types: self
                .event_types
                .ok_or_else(|| BuildError::missing_field("event_types"))?,
            scope: self.scope,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
