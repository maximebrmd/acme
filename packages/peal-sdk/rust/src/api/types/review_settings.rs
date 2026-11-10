pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReviewSettings {
    #[serde(rename = "approvalPolicy")]
    pub approval_policy: ApprovalPolicy,
}

impl ReviewSettings {
    pub fn builder() -> ReviewSettingsBuilder {
        <ReviewSettingsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewSettingsBuilder {
    approval_policy: Option<ApprovalPolicy>,
}

impl ReviewSettingsBuilder {
    pub fn approval_policy(mut self, value: ApprovalPolicy) -> Self {
        self.approval_policy = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReviewSettings`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approval_policy`](ReviewSettingsBuilder::approval_policy)
    pub fn build(self) -> Result<ReviewSettings, BuildError> {
        Ok(ReviewSettings {
            approval_policy: self
                .approval_policy
                .ok_or_else(|| BuildError::missing_field("approval_policy"))?,
        })
    }
}
