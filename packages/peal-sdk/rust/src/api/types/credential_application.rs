pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CredentialApplication {
    #[serde(rename = "clientId")]
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub scopes: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace: Option<CredentialBoundWorkspace>,
}

impl CredentialApplication {
    pub fn builder() -> CredentialApplicationBuilder {
        <CredentialApplicationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CredentialApplicationBuilder {
    client_id: Option<String>,
    scopes: Option<Vec<String>>,
    workspace: Option<CredentialBoundWorkspace>,
}

impl CredentialApplicationBuilder {
    pub fn client_id(mut self, value: impl Into<String>) -> Self {
        self.client_id = Some(value.into());
        self
    }

    pub fn scopes(mut self, value: Vec<String>) -> Self {
        self.scopes = Some(value);
        self
    }

    pub fn workspace(mut self, value: CredentialBoundWorkspace) -> Self {
        self.workspace = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CredentialApplication`].
    /// This method will fail if any of the following fields are not set:
    /// - [`client_id`](CredentialApplicationBuilder::client_id)
    /// - [`scopes`](CredentialApplicationBuilder::scopes)
    pub fn build(self) -> Result<CredentialApplication, BuildError> {
        Ok(CredentialApplication {
            client_id: self
                .client_id
                .ok_or_else(|| BuildError::missing_field("client_id"))?,
            scopes: self
                .scopes
                .ok_or_else(|| BuildError::missing_field("scopes"))?,
            workspace: self.workspace,
        })
    }
}
