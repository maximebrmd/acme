pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct LookupInputInvalidEncoded {
    #[serde(rename = "_tag")]
    pub tag: LookupInputInvalidEncodedTag,
}

impl LookupInputInvalidEncoded {
    pub fn builder() -> LookupInputInvalidEncodedBuilder {
        <LookupInputInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LookupInputInvalidEncodedBuilder {
    tag: Option<LookupInputInvalidEncodedTag>,
}

impl LookupInputInvalidEncodedBuilder {
    pub fn tag(mut self, value: LookupInputInvalidEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`LookupInputInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](LookupInputInvalidEncodedBuilder::tag)
    pub fn build(self) -> Result<LookupInputInvalidEncoded, BuildError> {
        Ok(LookupInputInvalidEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
