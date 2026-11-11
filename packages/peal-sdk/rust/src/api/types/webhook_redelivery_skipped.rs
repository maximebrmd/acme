pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookRedeliverySkipped {
    #[serde(rename = "deliveryId")]
    #[serde(default)]
    pub delivery_id: String,
    pub reason: WebhookRedeliverySkip,
}

impl WebhookRedeliverySkipped {
    pub fn builder() -> WebhookRedeliverySkippedBuilder {
        <WebhookRedeliverySkippedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookRedeliverySkippedBuilder {
    delivery_id: Option<String>,
    reason: Option<WebhookRedeliverySkip>,
}

impl WebhookRedeliverySkippedBuilder {
    pub fn delivery_id(mut self, value: impl Into<String>) -> Self {
        self.delivery_id = Some(value.into());
        self
    }

    pub fn reason(mut self, value: WebhookRedeliverySkip) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookRedeliverySkipped`].
    /// This method will fail if any of the following fields are not set:
    /// - [`delivery_id`](WebhookRedeliverySkippedBuilder::delivery_id)
    /// - [`reason`](WebhookRedeliverySkippedBuilder::reason)
    pub fn build(self) -> Result<WebhookRedeliverySkipped, BuildError> {
        Ok(WebhookRedeliverySkipped {
            delivery_id: self
                .delivery_id
                .ok_or_else(|| BuildError::missing_field("delivery_id"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
