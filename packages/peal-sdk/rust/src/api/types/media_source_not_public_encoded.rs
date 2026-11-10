pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaSourceNotPublicEncoded {}

impl MediaSourceNotPublicEncoded {
    pub fn builder() -> MediaSourceNotPublicEncodedBuilder {
        <MediaSourceNotPublicEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaSourceNotPublicEncodedBuilder {}

impl MediaSourceNotPublicEncodedBuilder {
    /// Consumes the builder and constructs a [`MediaSourceNotPublicEncoded`].
    pub fn build(self) -> Result<MediaSourceNotPublicEncoded, BuildError> {
        Ok(MediaSourceNotPublicEncoded {})
    }
}
