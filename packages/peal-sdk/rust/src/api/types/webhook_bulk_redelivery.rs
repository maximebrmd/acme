pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookBulkRedelivery {
    #[serde(default)]
    pub redelivered: Vec<WebhookDelivery>,
    #[serde(default)]
    pub remaining: i64,
    #[serde(default)]
    pub skipped: Vec<WebhookRedeliverySkipped>,
}

impl WebhookBulkRedelivery {
    pub fn builder() -> WebhookBulkRedeliveryBuilder {
        <WebhookBulkRedeliveryBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookBulkRedeliveryBuilder {
    redelivered: Option<Vec<WebhookDelivery>>,
    remaining: Option<i64>,
    skipped: Option<Vec<WebhookRedeliverySkipped>>,
}

impl WebhookBulkRedeliveryBuilder {
    pub fn redelivered(mut self, value: Vec<WebhookDelivery>) -> Self {
        self.redelivered = Some(value);
        self
    }

    pub fn remaining(mut self, value: i64) -> Self {
        self.remaining = Some(value);
        self
    }

    pub fn skipped(mut self, value: Vec<WebhookRedeliverySkipped>) -> Self {
        self.skipped = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookBulkRedelivery`].
    /// This method will fail if any of the following fields are not set:
    /// - [`redelivered`](WebhookBulkRedeliveryBuilder::redelivered)
    /// - [`remaining`](WebhookBulkRedeliveryBuilder::remaining)
    /// - [`skipped`](WebhookBulkRedeliveryBuilder::skipped)
    pub fn build(self) -> Result<WebhookBulkRedelivery, BuildError> {
        Ok(WebhookBulkRedelivery {
            redelivered: self
                .redelivered
                .ok_or_else(|| BuildError::missing_field("redelivered"))?,
            remaining: self
                .remaining
                .ok_or_else(|| BuildError::missing_field("remaining"))?,
            skipped: self
                .skipped
                .ok_or_else(|| BuildError::missing_field("skipped"))?,
        })
    }
}
