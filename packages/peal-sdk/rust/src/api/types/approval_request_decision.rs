pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ApprovalRequestDecision {
    #[serde(default)]
    pub at: String,
    pub by: Reviewer,
}

impl ApprovalRequestDecision {
    pub fn builder() -> ApprovalRequestDecisionBuilder {
        <ApprovalRequestDecisionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalRequestDecisionBuilder {
    at: Option<String>,
    by: Option<Reviewer>,
}

impl ApprovalRequestDecisionBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn by(mut self, value: Reviewer) -> Self {
        self.by = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ApprovalRequestDecision`].
    /// This method will fail if any of the following fields are not set:
    /// - [`at`](ApprovalRequestDecisionBuilder::at)
    /// - [`by`](ApprovalRequestDecisionBuilder::by)
    pub fn build(self) -> Result<ApprovalRequestDecision, BuildError> {
        Ok(ApprovalRequestDecision {
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            by: self.by.ok_or_else(|| BuildError::missing_field("by"))?,
        })
    }
}
