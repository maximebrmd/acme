pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApprovalChangedEncoded {}

impl ApprovalChangedEncoded {
    pub fn builder() -> ApprovalChangedEncodedBuilder {
        <ApprovalChangedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalChangedEncodedBuilder {}

impl ApprovalChangedEncodedBuilder {
    /// Consumes the builder and constructs a [`ApprovalChangedEncoded`].
    pub fn build(self) -> Result<ApprovalChangedEncoded, BuildError> {
        Ok(ApprovalChangedEncoded {})
    }
}
