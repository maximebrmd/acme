pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookEndpointNotFoundEncoded {}

impl WebhookEndpointNotFoundEncoded {
    pub fn builder() -> WebhookEndpointNotFoundEncodedBuilder {
        <WebhookEndpointNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookEndpointNotFoundEncodedBuilder {}

impl WebhookEndpointNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`WebhookEndpointNotFoundEncoded`].
    pub fn build(self) -> Result<WebhookEndpointNotFoundEncoded, BuildError> {
        Ok(WebhookEndpointNotFoundEncoded {})
    }
}
