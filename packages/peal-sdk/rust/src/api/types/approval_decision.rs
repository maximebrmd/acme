pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApprovalDecision {
    #[serde(rename = "approvalId")]
    #[serde(default)]
    pub approval_id: String,
    #[serde(rename = "subjectHash")]
    #[serde(default)]
    pub subject_hash: String,
}

impl ApprovalDecision {
    pub fn builder() -> ApprovalDecisionBuilder {
        <ApprovalDecisionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalDecisionBuilder {
    approval_id: Option<String>,
    subject_hash: Option<String>,
}

impl ApprovalDecisionBuilder {
    pub fn approval_id(mut self, value: impl Into<String>) -> Self {
        self.approval_id = Some(value.into());
        self
    }

    pub fn subject_hash(mut self, value: impl Into<String>) -> Self {
        self.subject_hash = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ApprovalDecision`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approval_id`](ApprovalDecisionBuilder::approval_id)
    /// - [`subject_hash`](ApprovalDecisionBuilder::subject_hash)
    pub fn build(self) -> Result<ApprovalDecision, BuildError> {
        Ok(ApprovalDecision {
            approval_id: self
                .approval_id
                .ok_or_else(|| BuildError::missing_field("approval_id"))?,
            subject_hash: self
                .subject_hash
                .ok_or_else(|| BuildError::missing_field("subject_hash"))?,
        })
    }
}
