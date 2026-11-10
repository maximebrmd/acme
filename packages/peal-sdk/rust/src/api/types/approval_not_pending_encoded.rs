pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApprovalNotPendingEncoded {}

impl ApprovalNotPendingEncoded {
    pub fn builder() -> ApprovalNotPendingEncodedBuilder {
        <ApprovalNotPendingEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalNotPendingEncodedBuilder {}

impl ApprovalNotPendingEncodedBuilder {
    /// Consumes the builder and constructs a [`ApprovalNotPendingEncoded`].
    pub fn build(self) -> Result<ApprovalNotPendingEncoded, BuildError> {
        Ok(ApprovalNotPendingEncoded {})
    }
}
