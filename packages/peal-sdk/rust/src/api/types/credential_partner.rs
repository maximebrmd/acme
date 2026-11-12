pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CredentialPartner {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
}

impl CredentialPartner {
    pub fn builder() -> CredentialPartnerBuilder {
        <CredentialPartnerBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CredentialPartnerBuilder {
    id: Option<String>,
    name: Option<String>,
}

impl CredentialPartnerBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CredentialPartner`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](CredentialPartnerBuilder::id)
    /// - [`name`](CredentialPartnerBuilder::name)
    pub fn build(self) -> Result<CredentialPartner, BuildError> {
        Ok(CredentialPartner {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
