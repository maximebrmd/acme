pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxThreadNotFoundEncoded {}

impl InboxThreadNotFoundEncoded {
    pub fn builder() -> InboxThreadNotFoundEncodedBuilder {
        <InboxThreadNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxThreadNotFoundEncodedBuilder {}

impl InboxThreadNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`InboxThreadNotFoundEncoded`].
    pub fn build(self) -> Result<InboxThreadNotFoundEncoded, BuildError> {
        Ok(InboxThreadNotFoundEncoded {})
    }
}
