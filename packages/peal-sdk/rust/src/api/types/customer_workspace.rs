pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CustomerWorkspace {
    #[serde(default)]
    pub channels: i64,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "externalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
}

impl CustomerWorkspace {
    pub fn builder() -> CustomerWorkspaceBuilder {
        <CustomerWorkspaceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CustomerWorkspaceBuilder {
    channels: Option<i64>,
    created_at: Option<String>,
    external_id: Option<String>,
    id: Option<String>,
    name: Option<String>,
}

impl CustomerWorkspaceBuilder {
    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CustomerWorkspace`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](CustomerWorkspaceBuilder::channels)
    /// - [`created_at`](CustomerWorkspaceBuilder::created_at)
    /// - [`id`](CustomerWorkspaceBuilder::id)
    /// - [`name`](CustomerWorkspaceBuilder::name)
    pub fn build(self) -> Result<CustomerWorkspace, BuildError> {
        Ok(CustomerWorkspace {
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            external_id: self.external_id,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
