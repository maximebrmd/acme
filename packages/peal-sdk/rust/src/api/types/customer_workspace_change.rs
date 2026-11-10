pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CustomerWorkspaceChange {
    #[serde(rename = "externalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

impl CustomerWorkspaceChange {
    pub fn builder() -> CustomerWorkspaceChangeBuilder {
        <CustomerWorkspaceChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CustomerWorkspaceChangeBuilder {
    external_id: Option<String>,
    name: Option<String>,
}

impl CustomerWorkspaceChangeBuilder {
    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CustomerWorkspaceChange`].
    pub fn build(self) -> Result<CustomerWorkspaceChange, BuildError> {
        Ok(CustomerWorkspaceChange {
            external_id: self.external_id,
            name: self.name,
        })
    }
}
