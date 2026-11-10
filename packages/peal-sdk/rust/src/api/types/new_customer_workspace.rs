pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewCustomerWorkspace {
    #[serde(rename = "externalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(default)]
    pub name: String,
}

impl NewCustomerWorkspace {
    pub fn builder() -> NewCustomerWorkspaceBuilder {
        <NewCustomerWorkspaceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewCustomerWorkspaceBuilder {
    external_id: Option<String>,
    name: Option<String>,
}

impl NewCustomerWorkspaceBuilder {
    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewCustomerWorkspace`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](NewCustomerWorkspaceBuilder::name)
    pub fn build(self) -> Result<NewCustomerWorkspace, BuildError> {
        Ok(NewCustomerWorkspace {
            external_id: self.external_id,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
