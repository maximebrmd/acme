pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LookupNotFoundEncoded {}

impl LookupNotFoundEncoded {
    pub fn builder() -> LookupNotFoundEncodedBuilder {
        <LookupNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LookupNotFoundEncodedBuilder {}

impl LookupNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`LookupNotFoundEncoded`].
    pub fn build(self) -> Result<LookupNotFoundEncoded, BuildError> {
        Ok(LookupNotFoundEncoded {})
    }
}
