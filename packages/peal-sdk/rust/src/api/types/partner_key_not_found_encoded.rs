pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerKeyNotFoundEncoded {}

impl PartnerKeyNotFoundEncoded {
    pub fn builder() -> PartnerKeyNotFoundEncodedBuilder {
        <PartnerKeyNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerKeyNotFoundEncodedBuilder {}

impl PartnerKeyNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`PartnerKeyNotFoundEncoded`].
    pub fn build(self) -> Result<PartnerKeyNotFoundEncoded, BuildError> {
        Ok(PartnerKeyNotFoundEncoded {})
    }
}
