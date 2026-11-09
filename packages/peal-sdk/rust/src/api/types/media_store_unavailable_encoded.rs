pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaStoreUnavailableEncoded {
    #[serde(rename = "_tag")]
    pub tag: MediaStoreUnavailableEncodedTag,
}

impl MediaStoreUnavailableEncoded {
    pub fn builder() -> MediaStoreUnavailableEncodedBuilder {
        <MediaStoreUnavailableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaStoreUnavailableEncodedBuilder {
    tag: Option<MediaStoreUnavailableEncodedTag>,
}

impl MediaStoreUnavailableEncodedBuilder {
    pub fn tag(mut self, value: MediaStoreUnavailableEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaStoreUnavailableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](MediaStoreUnavailableEncodedBuilder::tag)
    pub fn build(self) -> Result<MediaStoreUnavailableEncoded, BuildError> {
        Ok(MediaStoreUnavailableEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
