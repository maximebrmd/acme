pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InvitationNotFoundEncoded {}

impl InvitationNotFoundEncoded {
    pub fn builder() -> InvitationNotFoundEncodedBuilder {
        <InvitationNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InvitationNotFoundEncodedBuilder {}

impl InvitationNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`InvitationNotFoundEncoded`].
    pub fn build(self) -> Result<InvitationNotFoundEncoded, BuildError> {
        Ok(InvitationNotFoundEncoded {})
    }
}
