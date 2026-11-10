pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ChangesOutcome {
    pub approval: ApprovalRequest,
    pub comment: ReviewComment,
}

impl ChangesOutcome {
    pub fn builder() -> ChangesOutcomeBuilder {
        <ChangesOutcomeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChangesOutcomeBuilder {
    approval: Option<ApprovalRequest>,
    comment: Option<ReviewComment>,
}

impl ChangesOutcomeBuilder {
    pub fn approval(mut self, value: ApprovalRequest) -> Self {
        self.approval = Some(value);
        self
    }

    pub fn comment(mut self, value: ReviewComment) -> Self {
        self.comment = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChangesOutcome`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approval`](ChangesOutcomeBuilder::approval)
    /// - [`comment`](ChangesOutcomeBuilder::comment)
    pub fn build(self) -> Result<ChangesOutcome, BuildError> {
        Ok(ChangesOutcome {
            approval: self
                .approval
                .ok_or_else(|| BuildError::missing_field("approval"))?,
            comment: self
                .comment
                .ok_or_else(|| BuildError::missing_field("comment"))?,
        })
    }
}
