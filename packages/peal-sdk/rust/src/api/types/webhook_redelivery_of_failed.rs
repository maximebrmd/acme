pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookRedeliveryOfFailed {
    #[serde(rename = "endpointId")]
    #[serde(default)]
    pub endpoint_id: String,
    #[serde(rename = "eventType")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_type: Option<SubscribableWebhookEventType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub since: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<String>,
}

impl WebhookRedeliveryOfFailed {
    pub fn builder() -> WebhookRedeliveryOfFailedBuilder {
        <WebhookRedeliveryOfFailedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookRedeliveryOfFailedBuilder {
    endpoint_id: Option<String>,
    event_type: Option<SubscribableWebhookEventType>,
    since: Option<String>,
    until: Option<String>,
}

impl WebhookRedeliveryOfFailedBuilder {
    pub fn endpoint_id(mut self, value: impl Into<String>) -> Self {
        self.endpoint_id = Some(value.into());
        self
    }

    pub fn event_type(mut self, value: SubscribableWebhookEventType) -> Self {
        self.event_type = Some(value);
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

    /// Consumes the builder and constructs a [`WebhookRedeliveryOfFailed`].
    /// This method will fail if any of the following fields are not set:
    /// - [`endpoint_id`](WebhookRedeliveryOfFailedBuilder::endpoint_id)
    pub fn build(self) -> Result<WebhookRedeliveryOfFailed, BuildError> {
        Ok(WebhookRedeliveryOfFailed {
            endpoint_id: self
                .endpoint_id
                .ok_or_else(|| BuildError::missing_field("endpoint_id"))?,
            event_type: self.event_type,
            since: self.since,
            until: self.until,
        })
    }
}
