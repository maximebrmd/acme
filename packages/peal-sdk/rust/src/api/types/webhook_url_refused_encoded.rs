pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookUrlRefusedEncoded {
    #[serde(rename = "_tag")]
    pub tag: WebhookUrlRefusedEncodedTag,
    pub reason: WebhookUrlRefusal,
}

impl WebhookUrlRefusedEncoded {
    pub fn builder() -> WebhookUrlRefusedEncodedBuilder {
        <WebhookUrlRefusedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookUrlRefusedEncodedBuilder {
    tag: Option<WebhookUrlRefusedEncodedTag>,
    reason: Option<WebhookUrlRefusal>,
}

impl WebhookUrlRefusedEncodedBuilder {
    pub fn tag(mut self, value: WebhookUrlRefusedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn reason(mut self, value: WebhookUrlRefusal) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookUrlRefusedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](WebhookUrlRefusedEncodedBuilder::tag)
    /// - [`reason`](WebhookUrlRefusedEncodedBuilder::reason)
    pub fn build(self) -> Result<WebhookUrlRefusedEncoded, BuildError> {
        Ok(WebhookUrlRefusedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
