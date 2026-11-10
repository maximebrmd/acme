pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ApprovalNotPendingEncoded {
    #[serde(rename = "_tag")]
    pub tag: ApprovalNotPendingEncodedTag,
}

impl ApprovalNotPendingEncoded {
    pub fn builder() -> ApprovalNotPendingEncodedBuilder {
        <ApprovalNotPendingEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalNotPendingEncodedBuilder {
    tag: Option<ApprovalNotPendingEncodedTag>,
}

impl ApprovalNotPendingEncodedBuilder {
    pub fn tag(mut self, value: ApprovalNotPendingEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ApprovalNotPendingEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ApprovalNotPendingEncodedBuilder::tag)
    pub fn build(self) -> Result<ApprovalNotPendingEncoded, BuildError> {
        Ok(ApprovalNotPendingEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
