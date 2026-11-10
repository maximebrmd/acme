pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TooManyWebhookSendsEncoded {
    #[serde(rename = "_tag")]
    pub tag: TooManyWebhookSendsEncodedTag,
    #[serde(default)]
    pub allowed: i64,
}

impl TooManyWebhookSendsEncoded {
    pub fn builder() -> TooManyWebhookSendsEncodedBuilder {
        <TooManyWebhookSendsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyWebhookSendsEncodedBuilder {
    tag: Option<TooManyWebhookSendsEncodedTag>,
    allowed: Option<i64>,
}

impl TooManyWebhookSendsEncodedBuilder {
    pub fn tag(mut self, value: TooManyWebhookSendsEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TooManyWebhookSendsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](TooManyWebhookSendsEncodedBuilder::tag)
    /// - [`allowed`](TooManyWebhookSendsEncodedBuilder::allowed)
    pub fn build(self) -> Result<TooManyWebhookSendsEncoded, BuildError> {
        Ok(TooManyWebhookSendsEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
        })
    }
}
