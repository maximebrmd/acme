pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AltTextTooLongEncoded {
    #[serde(rename = "_tag")]
    pub tag: AltTextTooLongEncodedTag,
    #[serde(rename = "maxLength")]
    #[serde(default)]
    pub max_length: i64,
}

impl AltTextTooLongEncoded {
    pub fn builder() -> AltTextTooLongEncodedBuilder {
        <AltTextTooLongEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AltTextTooLongEncodedBuilder {
    tag: Option<AltTextTooLongEncodedTag>,
    max_length: Option<i64>,
}

impl AltTextTooLongEncodedBuilder {
    pub fn tag(mut self, value: AltTextTooLongEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn max_length(mut self, value: i64) -> Self {
        self.max_length = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AltTextTooLongEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AltTextTooLongEncodedBuilder::tag)
    /// - [`max_length`](AltTextTooLongEncodedBuilder::max_length)
    pub fn build(self) -> Result<AltTextTooLongEncoded, BuildError> {
        Ok(AltTextTooLongEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            max_length: self
                .max_length
                .ok_or_else(|| BuildError::missing_field("max_length"))?,
        })
    }
}
