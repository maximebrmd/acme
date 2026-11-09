pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaNotFoundEncoded {}

impl MediaNotFoundEncoded {
    pub fn builder() -> MediaNotFoundEncodedBuilder {
        <MediaNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaNotFoundEncodedBuilder {}

impl MediaNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`MediaNotFoundEncoded`].
    pub fn build(self) -> Result<MediaNotFoundEncoded, BuildError> {
        Ok(MediaNotFoundEncoded {})
    }
}
