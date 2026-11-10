pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaImportBusyEncoded {
    #[serde(rename = "_tag")]
    pub tag: MediaImportBusyEncodedTag,
}

impl MediaImportBusyEncoded {
    pub fn builder() -> MediaImportBusyEncodedBuilder {
        <MediaImportBusyEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaImportBusyEncodedBuilder {
    tag: Option<MediaImportBusyEncodedTag>,
}

impl MediaImportBusyEncodedBuilder {
    pub fn tag(mut self, value: MediaImportBusyEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaImportBusyEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](MediaImportBusyEncodedBuilder::tag)
    pub fn build(self) -> Result<MediaImportBusyEncoded, BuildError> {
        Ok(MediaImportBusyEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
