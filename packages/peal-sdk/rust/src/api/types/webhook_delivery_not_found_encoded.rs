pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookDeliveryNotFoundEncoded {}

impl WebhookDeliveryNotFoundEncoded {
    pub fn builder() -> WebhookDeliveryNotFoundEncodedBuilder {
        <WebhookDeliveryNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookDeliveryNotFoundEncodedBuilder {}

impl WebhookDeliveryNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`WebhookDeliveryNotFoundEncoded`].
    pub fn build(self) -> Result<WebhookDeliveryNotFoundEncoded, BuildError> {
        Ok(WebhookDeliveryNotFoundEncoded {})
    }
}
