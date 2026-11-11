pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewWebhookEndpoint {
    #[serde(rename = "channelIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(rename = "eventTypes")]
    #[serde(default)]
    pub event_types: Vec<SubscribableWebhookEventType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<Vec<WebhookHeader>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<WebhookEndpointScope>,
    #[serde(default)]
    pub url: String,
    #[serde(rename = "workspaceIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_ids: Option<Vec<String>>,
}

impl NewWebhookEndpoint {
    pub fn builder() -> NewWebhookEndpointBuilder {
        <NewWebhookEndpointBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewWebhookEndpointBuilder {
    channel_ids: Option<Vec<String>>,
    description: Option<String>,
    enabled: Option<bool>,
    event_types: Option<Vec<SubscribableWebhookEventType>>,
    headers: Option<Vec<WebhookHeader>>,
    scope: Option<WebhookEndpointScope>,
    url: Option<String>,
    workspace_ids: Option<Vec<String>>,
}

impl NewWebhookEndpointBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

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

    pub fn headers(mut self, value: Vec<WebhookHeader>) -> Self {
        self.headers = Some(value);
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

    pub fn workspace_ids(mut self, value: Vec<String>) -> Self {
        self.workspace_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewWebhookEndpoint`].
    /// This method will fail if any of the following fields are not set:
    /// - [`event_types`](NewWebhookEndpointBuilder::event_types)
    /// - [`url`](NewWebhookEndpointBuilder::url)
    pub fn build(self) -> Result<NewWebhookEndpoint, BuildError> {
        Ok(NewWebhookEndpoint {
            channel_ids: self.channel_ids,
            description: self.description,
            enabled: self.enabled,
            event_types: self
                .event_types
                .ok_or_else(|| BuildError::missing_field("event_types"))?,
            headers: self.headers,
            scope: self.scope,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
            workspace_ids: self.workspace_ids,
        })
    }
}
