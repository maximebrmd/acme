pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlatformUnreachableEncoded {
    #[serde(rename = "_tag")]
    pub tag: PlatformUnreachableEncodedTag,
}

impl PlatformUnreachableEncoded {
    pub fn builder() -> PlatformUnreachableEncodedBuilder {
        <PlatformUnreachableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformUnreachableEncodedBuilder {
    tag: Option<PlatformUnreachableEncodedTag>,
}

impl PlatformUnreachableEncodedBuilder {
    pub fn tag(mut self, value: PlatformUnreachableEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformUnreachableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PlatformUnreachableEncodedBuilder::tag)
    pub fn build(self) -> Result<PlatformUnreachableEncoded, BuildError> {
        Ok(PlatformUnreachableEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
