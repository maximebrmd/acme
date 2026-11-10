pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhooksNotConfiguredEncoded {
    #[serde(rename = "_tag")]
    pub tag: WebhooksNotConfiguredEncodedTag,
}

impl WebhooksNotConfiguredEncoded {
    pub fn builder() -> WebhooksNotConfiguredEncodedBuilder {
        <WebhooksNotConfiguredEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhooksNotConfiguredEncodedBuilder {
    tag: Option<WebhooksNotConfiguredEncodedTag>,
}

impl WebhooksNotConfiguredEncodedBuilder {
    pub fn tag(mut self, value: WebhooksNotConfiguredEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhooksNotConfiguredEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](WebhooksNotConfiguredEncodedBuilder::tag)
    pub fn build(self) -> Result<WebhooksNotConfiguredEncoded, BuildError> {
        Ok(WebhooksNotConfiguredEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
