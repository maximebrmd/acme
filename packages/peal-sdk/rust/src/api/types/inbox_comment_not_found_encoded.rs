pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxCommentNotFoundEncoded {}

impl InboxCommentNotFoundEncoded {
    pub fn builder() -> InboxCommentNotFoundEncodedBuilder {
        <InboxCommentNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxCommentNotFoundEncodedBuilder {}

impl InboxCommentNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`InboxCommentNotFoundEncoded`].
    pub fn build(self) -> Result<InboxCommentNotFoundEncoded, BuildError> {
        Ok(InboxCommentNotFoundEncoded {})
    }
}
