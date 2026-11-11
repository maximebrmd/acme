pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
#[serde(transparent)]
pub struct WebhookRedeliveryByIds {
    pub delivery_ids: Vec<String>,
}

impl WebhookRedeliveryByIds {
    pub fn builder() -> WebhookRedeliveryByIdsBuilder {
        <WebhookRedeliveryByIdsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookRedeliveryByIdsBuilder {
    delivery_ids: Option<Vec<String>>,
}

impl WebhookRedeliveryByIdsBuilder {
    pub fn delivery_ids(mut self, value: Vec<String>) -> Self {
        self.delivery_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookRedeliveryByIds`].
    /// This method will fail if any of the following fields are not set:
    /// - [`delivery_ids`](WebhookRedeliveryByIdsBuilder::delivery_ids)
    pub fn build(self) -> Result<WebhookRedeliveryByIds, BuildError> {
        Ok(WebhookRedeliveryByIds {
            delivery_ids: self
                .delivery_ids
                .ok_or_else(|| BuildError::missing_field("delivery_ids"))?,
        })
    }
}
