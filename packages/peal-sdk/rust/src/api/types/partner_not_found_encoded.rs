pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerNotFoundEncoded {}

impl PartnerNotFoundEncoded {
    pub fn builder() -> PartnerNotFoundEncodedBuilder {
        <PartnerNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerNotFoundEncodedBuilder {}

impl PartnerNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`PartnerNotFoundEncoded`].
    pub fn build(self) -> Result<PartnerNotFoundEncoded, BuildError> {
        Ok(PartnerNotFoundEncoded {})
    }
}
