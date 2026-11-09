pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ForbiddenEncoded {
    #[serde(rename = "_tag")]
    pub tag: ForbiddenEncodedTag,
}

impl ForbiddenEncoded {
    pub fn builder() -> ForbiddenEncodedBuilder {
        <ForbiddenEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ForbiddenEncodedBuilder {
    tag: Option<ForbiddenEncodedTag>,
}

impl ForbiddenEncodedBuilder {
    pub fn tag(mut self, value: ForbiddenEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ForbiddenEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ForbiddenEncodedBuilder::tag)
    pub fn build(self) -> Result<ForbiddenEncoded, BuildError> {
        Ok(ForbiddenEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
