pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AlreadyMemberEncoded {}

impl AlreadyMemberEncoded {
    pub fn builder() -> AlreadyMemberEncodedBuilder {
        <AlreadyMemberEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AlreadyMemberEncodedBuilder {}

impl AlreadyMemberEncodedBuilder {
    /// Consumes the builder and constructs a [`AlreadyMemberEncoded`].
    pub fn build(self) -> Result<AlreadyMemberEncoded, BuildError> {
        Ok(AlreadyMemberEncoded {})
    }
}
