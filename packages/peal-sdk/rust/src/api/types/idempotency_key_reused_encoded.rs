pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct IdempotencyKeyReusedEncoded {
    #[serde(rename = "_tag")]
    pub tag: IdempotencyKeyReusedEncodedTag,
}

impl IdempotencyKeyReusedEncoded {
    pub fn builder() -> IdempotencyKeyReusedEncodedBuilder {
        <IdempotencyKeyReusedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct IdempotencyKeyReusedEncodedBuilder {
    tag: Option<IdempotencyKeyReusedEncodedTag>,
}

impl IdempotencyKeyReusedEncodedBuilder {
    pub fn tag(mut self, value: IdempotencyKeyReusedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`IdempotencyKeyReusedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](IdempotencyKeyReusedEncodedBuilder::tag)
    pub fn build(self) -> Result<IdempotencyKeyReusedEncoded, BuildError> {
        Ok(IdempotencyKeyReusedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
