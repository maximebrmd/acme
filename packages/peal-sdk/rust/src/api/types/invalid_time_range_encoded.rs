pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InvalidTimeRangeEncoded {
    #[serde(rename = "_tag")]
    pub tag: InvalidTimeRangeEncodedTag,
}

impl InvalidTimeRangeEncoded {
    pub fn builder() -> InvalidTimeRangeEncodedBuilder {
        <InvalidTimeRangeEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InvalidTimeRangeEncodedBuilder {
    tag: Option<InvalidTimeRangeEncodedTag>,
}

impl InvalidTimeRangeEncodedBuilder {
    pub fn tag(mut self, value: InvalidTimeRangeEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InvalidTimeRangeEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InvalidTimeRangeEncodedBuilder::tag)
    pub fn build(self) -> Result<InvalidTimeRangeEncoded, BuildError> {
        Ok(InvalidTimeRangeEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
