pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UsageSharing {
    #[serde(rename = "partnerWorkspaceId")]
    #[serde(default)]
    pub partner_workspace_id: String,
}

impl UsageSharing {
    pub fn builder() -> UsageSharingBuilder {
        <UsageSharingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UsageSharingBuilder {
    partner_workspace_id: Option<String>,
}

impl UsageSharingBuilder {
    pub fn partner_workspace_id(mut self, value: impl Into<String>) -> Self {
        self.partner_workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`UsageSharing`].
    /// This method will fail if any of the following fields are not set:
    /// - [`partner_workspace_id`](UsageSharingBuilder::partner_workspace_id)
    pub fn build(self) -> Result<UsageSharing, BuildError> {
        Ok(UsageSharing {
            partner_workspace_id: self
                .partner_workspace_id
                .ok_or_else(|| BuildError::missing_field("partner_workspace_id"))?,
        })
    }
}
