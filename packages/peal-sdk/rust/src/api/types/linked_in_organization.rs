pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LinkedInOrganization {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub urn: String,
    #[serde(rename = "vanityName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vanity_name: Option<String>,
}

impl LinkedInOrganization {
    pub fn builder() -> LinkedInOrganizationBuilder {
        <LinkedInOrganizationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LinkedInOrganizationBuilder {
    name: Option<String>,
    urn: Option<String>,
    vanity_name: Option<String>,
}

impl LinkedInOrganizationBuilder {
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn urn(mut self, value: impl Into<String>) -> Self {
        self.urn = Some(value.into());
        self
    }

    pub fn vanity_name(mut self, value: impl Into<String>) -> Self {
        self.vanity_name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LinkedInOrganization`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](LinkedInOrganizationBuilder::name)
    /// - [`urn`](LinkedInOrganizationBuilder::urn)
    pub fn build(self) -> Result<LinkedInOrganization, BuildError> {
        Ok(LinkedInOrganization {
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            urn: self.urn.ok_or_else(|| BuildError::missing_field("urn"))?,
            vanity_name: self.vanity_name,
        })
    }
}
