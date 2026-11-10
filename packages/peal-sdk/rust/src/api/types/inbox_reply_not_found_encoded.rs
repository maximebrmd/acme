pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxReplyNotFoundEncoded {}

impl InboxReplyNotFoundEncoded {
    pub fn builder() -> InboxReplyNotFoundEncodedBuilder {
        <InboxReplyNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxReplyNotFoundEncodedBuilder {}

impl InboxReplyNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`InboxReplyNotFoundEncoded`].
    pub fn build(self) -> Result<InboxReplyNotFoundEncoded, BuildError> {
        Ok(InboxReplyNotFoundEncoded {})
    }
}
