pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct EffectHttpApiErrorBadRequestEncoded {
    #[serde(rename = "_tag")]
    pub tag: EffectHttpApiErrorBadRequestEncodedTag,
}

impl EffectHttpApiErrorBadRequestEncoded {
    pub fn builder() -> EffectHttpApiErrorBadRequestEncodedBuilder {
        <EffectHttpApiErrorBadRequestEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct EffectHttpApiErrorBadRequestEncodedBuilder {
    tag: Option<EffectHttpApiErrorBadRequestEncodedTag>,
}

impl EffectHttpApiErrorBadRequestEncodedBuilder {
    pub fn tag(mut self, value: EffectHttpApiErrorBadRequestEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`EffectHttpApiErrorBadRequestEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](EffectHttpApiErrorBadRequestEncodedBuilder::tag)
    pub fn build(self) -> Result<EffectHttpApiErrorBadRequestEncoded, BuildError> {
        Ok(EffectHttpApiErrorBadRequestEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
