pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TooManyWebhookEndpointsEncoded {
    #[serde(rename = "_tag")]
    pub tag: TooManyWebhookEndpointsEncodedTag,
    #[serde(default)]
    pub allowed: i64,
}

impl TooManyWebhookEndpointsEncoded {
    pub fn builder() -> TooManyWebhookEndpointsEncodedBuilder {
        <TooManyWebhookEndpointsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyWebhookEndpointsEncodedBuilder {
    tag: Option<TooManyWebhookEndpointsEncodedTag>,
    allowed: Option<i64>,
}

impl TooManyWebhookEndpointsEncodedBuilder {
    pub fn tag(mut self, value: TooManyWebhookEndpointsEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TooManyWebhookEndpointsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](TooManyWebhookEndpointsEncodedBuilder::tag)
    /// - [`allowed`](TooManyWebhookEndpointsEncodedBuilder::allowed)
    pub fn build(self) -> Result<TooManyWebhookEndpointsEncoded, BuildError> {
        Ok(TooManyWebhookEndpointsEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
        })
    }
}
