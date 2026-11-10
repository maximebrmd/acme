pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookEndpointDisabledEncoded {
    #[serde(rename = "_tag")]
    pub tag: WebhookEndpointDisabledEncodedTag,
}

impl WebhookEndpointDisabledEncoded {
    pub fn builder() -> WebhookEndpointDisabledEncodedBuilder {
        <WebhookEndpointDisabledEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookEndpointDisabledEncodedBuilder {
    tag: Option<WebhookEndpointDisabledEncodedTag>,
}

impl WebhookEndpointDisabledEncodedBuilder {
    pub fn tag(mut self, value: WebhookEndpointDisabledEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookEndpointDisabledEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](WebhookEndpointDisabledEncodedBuilder::tag)
    pub fn build(self) -> Result<WebhookEndpointDisabledEncoded, BuildError> {
        Ok(WebhookEndpointDisabledEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
