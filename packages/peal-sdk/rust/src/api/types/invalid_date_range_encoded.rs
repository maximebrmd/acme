pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InvalidDateRangeEncoded {
    #[serde(rename = "_tag")]
    pub tag: InvalidDateRangeEncodedTag,
}

impl InvalidDateRangeEncoded {
    pub fn builder() -> InvalidDateRangeEncodedBuilder {
        <InvalidDateRangeEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InvalidDateRangeEncodedBuilder {
    tag: Option<InvalidDateRangeEncodedTag>,
}

impl InvalidDateRangeEncodedBuilder {
    pub fn tag(mut self, value: InvalidDateRangeEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InvalidDateRangeEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InvalidDateRangeEncodedBuilder::tag)
    pub fn build(self) -> Result<InvalidDateRangeEncoded, BuildError> {
        Ok(InvalidDateRangeEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
