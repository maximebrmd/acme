pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CredentialApplication {
    pub binding: CredentialBinding,
    #[serde(rename = "clientId")]
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub scopes: Vec<String>,
}

impl CredentialApplication {
    pub fn builder() -> CredentialApplicationBuilder {
        <CredentialApplicationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CredentialApplicationBuilder {
    binding: Option<CredentialBinding>,
    client_id: Option<String>,
    scopes: Option<Vec<String>>,
}

impl CredentialApplicationBuilder {
    pub fn binding(mut self, value: CredentialBinding) -> Self {
        self.binding = Some(value);
        self
    }

    pub fn client_id(mut self, value: impl Into<String>) -> Self {
        self.client_id = Some(value.into());
        self
    }

    pub fn scopes(mut self, value: Vec<String>) -> Self {
        self.scopes = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CredentialApplication`].
    /// This method will fail if any of the following fields are not set:
    /// - [`binding`](CredentialApplicationBuilder::binding)
    /// - [`client_id`](CredentialApplicationBuilder::client_id)
    /// - [`scopes`](CredentialApplicationBuilder::scopes)
    pub fn build(self) -> Result<CredentialApplication, BuildError> {
        Ok(CredentialApplication {
            binding: self
                .binding
                .ok_or_else(|| BuildError::missing_field("binding"))?,
            client_id: self
                .client_id
                .ok_or_else(|| BuildError::missing_field("client_id"))?,
            scopes: self
                .scopes
                .ok_or_else(|| BuildError::missing_field("scopes"))?,
        })
    }
}
