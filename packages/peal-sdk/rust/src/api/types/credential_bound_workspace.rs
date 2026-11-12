pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CredentialBoundWorkspace {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<Permission>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refused: Option<OverviewRefusal>,
}

impl CredentialBoundWorkspace {
    pub fn builder() -> CredentialBoundWorkspaceBuilder {
        <CredentialBoundWorkspaceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CredentialBoundWorkspaceBuilder {
    id: Option<String>,
    name: Option<String>,
    permissions: Option<Vec<Permission>>,
    refused: Option<OverviewRefusal>,
}

impl CredentialBoundWorkspaceBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn permissions(mut self, value: Vec<Permission>) -> Self {
        self.permissions = Some(value);
        self
    }

    pub fn refused(mut self, value: OverviewRefusal) -> Self {
        self.refused = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CredentialBoundWorkspace`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](CredentialBoundWorkspaceBuilder::id)
    /// - [`name`](CredentialBoundWorkspaceBuilder::name)
    /// - [`permissions`](CredentialBoundWorkspaceBuilder::permissions)
    pub fn build(self) -> Result<CredentialBoundWorkspace, BuildError> {
        Ok(CredentialBoundWorkspace {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            permissions: self
                .permissions
                .ok_or_else(|| BuildError::missing_field("permissions"))?,
            refused: self.refused,
        })
    }
}
