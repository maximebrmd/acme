pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelNotFoundEncoded {}

impl ChannelNotFoundEncoded {
    pub fn builder() -> ChannelNotFoundEncodedBuilder {
        <ChannelNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelNotFoundEncodedBuilder {}

impl ChannelNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`ChannelNotFoundEncoded`].
    pub fn build(self) -> Result<ChannelNotFoundEncoded, BuildError> {
        Ok(ChannelNotFoundEncoded {})
    }
}
