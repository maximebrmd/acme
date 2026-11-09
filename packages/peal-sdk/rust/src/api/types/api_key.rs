pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApiKey {
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "expiresAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<Permission>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<String>,
}

impl ApiKey {
    pub fn builder() -> ApiKeyBuilder {
        <ApiKeyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApiKeyBuilder {
    created_at: Option<String>,
    expires_at: Option<String>,
    id: Option<String>,
    name: Option<String>,
    permissions: Option<Vec<Permission>>,
    start: Option<String>,
}

impl ApiKeyBuilder {
    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn expires_at(mut self, value: impl Into<String>) -> Self {
        self.expires_at = Some(value.into());
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

    pub fn permissions(mut self, value: Vec<Permission>) -> Self {
        self.permissions = Some(value);
        self
    }

    pub fn start(mut self, value: impl Into<String>) -> Self {
        self.start = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ApiKey`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](ApiKeyBuilder::created_at)
    /// - [`id`](ApiKeyBuilder::id)
    /// - [`name`](ApiKeyBuilder::name)
    /// - [`permissions`](ApiKeyBuilder::permissions)
    pub fn build(self) -> Result<ApiKey, BuildError> {
        Ok(ApiKey {
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            expires_at: self.expires_at,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            permissions: self
                .permissions
                .ok_or_else(|| BuildError::missing_field("permissions"))?,
            start: self.start,
        })
    }
}
