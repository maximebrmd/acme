pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TooManyInvitationsEncoded {}

impl TooManyInvitationsEncoded {
    pub fn builder() -> TooManyInvitationsEncodedBuilder {
        <TooManyInvitationsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyInvitationsEncodedBuilder {}

impl TooManyInvitationsEncodedBuilder {
    /// Consumes the builder and constructs a [`TooManyInvitationsEncoded`].
    pub fn build(self) -> Result<TooManyInvitationsEncoded, BuildError> {
        Ok(TooManyInvitationsEncoded {})
    }
}
