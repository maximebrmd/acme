pub use crate::prelude::*;

/// Query parameters for sendTest
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SendTestQueryRequest {
    #[serde(rename = "eventType")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_type: Option<SubscribableWebhookEventType>,
}

impl SendTestQueryRequest {
    pub fn builder() -> SendTestQueryRequestBuilder {
        <SendTestQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SendTestQueryRequestBuilder {
    event_type: Option<SubscribableWebhookEventType>,
}

impl SendTestQueryRequestBuilder {
    pub fn event_type(mut self, value: SubscribableWebhookEventType) -> Self {
        self.event_type = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SendTestQueryRequest`].
    pub fn build(self) -> Result<SendTestQueryRequest, BuildError> {
        Ok(SendTestQueryRequest {
            event_type: self.event_type,
        })
    }
}
