pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ApprovalOutcome {
    pub approval: ApprovalRequest,
    #[serde(default)]
    pub late: bool,
}

impl ApprovalOutcome {
    pub fn builder() -> ApprovalOutcomeBuilder {
        <ApprovalOutcomeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalOutcomeBuilder {
    approval: Option<ApprovalRequest>,
    late: Option<bool>,
}

impl ApprovalOutcomeBuilder {
    pub fn approval(mut self, value: ApprovalRequest) -> Self {
        self.approval = Some(value);
        self
    }

    pub fn late(mut self, value: bool) -> Self {
        self.late = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ApprovalOutcome`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approval`](ApprovalOutcomeBuilder::approval)
    /// - [`late`](ApprovalOutcomeBuilder::late)
    pub fn build(self) -> Result<ApprovalOutcome, BuildError> {
        Ok(ApprovalOutcome {
            approval: self
                .approval
                .ok_or_else(|| BuildError::missing_field("approval"))?,
            late: self.late.ok_or_else(|| BuildError::missing_field("late"))?,
        })
    }
}
