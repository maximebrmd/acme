pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CredentialWorkspace {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
}

impl CredentialWorkspace {
    pub fn builder() -> CredentialWorkspaceBuilder {
        <CredentialWorkspaceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CredentialWorkspaceBuilder {
    id: Option<String>,
    name: Option<String>,
}

impl CredentialWorkspaceBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CredentialWorkspace`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](CredentialWorkspaceBuilder::id)
    /// - [`name`](CredentialWorkspaceBuilder::name)
    pub fn build(self) -> Result<CredentialWorkspace, BuildError> {
        Ok(CredentialWorkspace {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
