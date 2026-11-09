pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct UploadIncompleteEncoded {
    #[serde(rename = "_tag")]
    pub tag: UploadIncompleteEncodedTag,
}

impl UploadIncompleteEncoded {
    pub fn builder() -> UploadIncompleteEncodedBuilder {
        <UploadIncompleteEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UploadIncompleteEncodedBuilder {
    tag: Option<UploadIncompleteEncodedTag>,
}

impl UploadIncompleteEncodedBuilder {
    pub fn tag(mut self, value: UploadIncompleteEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UploadIncompleteEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](UploadIncompleteEncodedBuilder::tag)
    pub fn build(self) -> Result<UploadIncompleteEncoded, BuildError> {
        Ok(UploadIncompleteEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
