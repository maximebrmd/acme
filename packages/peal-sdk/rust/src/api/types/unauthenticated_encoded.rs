pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct UnauthenticatedEncoded {
    #[serde(rename = "_tag")]
    pub tag: UnauthenticatedEncodedTag,
}

impl UnauthenticatedEncoded {
    pub fn builder() -> UnauthenticatedEncodedBuilder {
        <UnauthenticatedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnauthenticatedEncodedBuilder {
    tag: Option<UnauthenticatedEncodedTag>,
}

impl UnauthenticatedEncodedBuilder {
    pub fn tag(mut self, value: UnauthenticatedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnauthenticatedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](UnauthenticatedEncodedBuilder::tag)
    pub fn build(self) -> Result<UnauthenticatedEncoded, BuildError> {
        Ok(UnauthenticatedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
