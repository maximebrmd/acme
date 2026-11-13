pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AccountWorkspace {
    #[serde(default)]
    pub name: String,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl AccountWorkspace {
    pub fn builder() -> AccountWorkspaceBuilder {
        <AccountWorkspaceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AccountWorkspaceBuilder {
    name: Option<String>,
    workspace_id: Option<String>,
}

impl AccountWorkspaceBuilder {
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AccountWorkspace`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](AccountWorkspaceBuilder::name)
    /// - [`workspace_id`](AccountWorkspaceBuilder::workspace_id)
    pub fn build(self) -> Result<AccountWorkspace, BuildError> {
        Ok(AccountWorkspace {
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
