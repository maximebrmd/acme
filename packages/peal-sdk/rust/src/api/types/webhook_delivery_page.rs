pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookDeliveryPage {
    #[serde(default)]
    pub items: Vec<WebhookDelivery>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl WebhookDeliveryPage {
    pub fn builder() -> WebhookDeliveryPageBuilder {
        <WebhookDeliveryPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookDeliveryPageBuilder {
    items: Option<Vec<WebhookDelivery>>,
    next_cursor: Option<String>,
}

impl WebhookDeliveryPageBuilder {
    pub fn items(mut self, value: Vec<WebhookDelivery>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WebhookDeliveryPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](WebhookDeliveryPageBuilder::items)
    pub fn build(self) -> Result<WebhookDeliveryPage, BuildError> {
        Ok(WebhookDeliveryPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
