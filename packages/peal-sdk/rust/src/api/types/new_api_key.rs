pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewApiKey {
    #[serde(rename = "expiresInDays")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in_days: Option<i64>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<Permission>,
}

impl NewApiKey {
    pub fn builder() -> NewApiKeyBuilder {
        <NewApiKeyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewApiKeyBuilder {
    expires_in_days: Option<i64>,
    name: Option<String>,
    permissions: Option<Vec<Permission>>,
}

impl NewApiKeyBuilder {
    pub fn expires_in_days(mut self, value: i64) -> Self {
        self.expires_in_days = Some(value);
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

    /// Consumes the builder and constructs a [`NewApiKey`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](NewApiKeyBuilder::name)
    /// - [`permissions`](NewApiKeyBuilder::permissions)
    pub fn build(self) -> Result<NewApiKey, BuildError> {
        Ok(NewApiKey {
            expires_in_days: self.expires_in_days,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            permissions: self
                .permissions
                .ok_or_else(|| BuildError::missing_field("permissions"))?,
        })
    }
}
