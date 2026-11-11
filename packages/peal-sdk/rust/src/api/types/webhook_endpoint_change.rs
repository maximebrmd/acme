pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookEndpointChange {
    #[serde(rename = "channelIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(rename = "eventTypes")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_types: Option<Vec<SubscribableWebhookEventType>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(rename = "workspaceIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_ids: Option<Vec<String>>,
}

impl WebhookEndpointChange {
    pub fn builder() -> WebhookEndpointChangeBuilder {
        <WebhookEndpointChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookEndpointChangeBuilder {
    channel_ids: Option<Vec<String>>,
    description: Option<String>,
    enabled: Option<bool>,
    event_types: Option<Vec<SubscribableWebhookEventType>>,
    url: Option<String>,
    workspace_ids: Option<Vec<String>>,
}

impl WebhookEndpointChangeBuilder {
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

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    pub fn workspace_ids(mut self, value: Vec<String>) -> Self {
        self.workspace_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookEndpointChange`].
    pub fn build(self) -> Result<WebhookEndpointChange, BuildError> {
        Ok(WebhookEndpointChange {
            channel_ids: self.channel_ids,
            description: self.description,
            enabled: self.enabled,
            event_types: self.event_types,
            url: self.url,
            workspace_ids: self.workspace_ids,
        })
    }
}
