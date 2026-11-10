pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerKey {
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
    #[serde(default)]
    pub scopes: Vec<PartnerScope>,
    #[serde(default)]
    pub start: String,
}

impl PartnerKey {
    pub fn builder() -> PartnerKeyBuilder {
        <PartnerKeyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerKeyBuilder {
    created_at: Option<String>,
    expires_at: Option<String>,
    id: Option<String>,
    name: Option<String>,
    permissions: Option<Vec<Permission>>,
    scopes: Option<Vec<PartnerScope>>,
    start: Option<String>,
}

impl PartnerKeyBuilder {
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

    pub fn scopes(mut self, value: Vec<PartnerScope>) -> Self {
        self.scopes = Some(value);
        self
    }

    pub fn start(mut self, value: impl Into<String>) -> Self {
        self.start = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PartnerKey`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](PartnerKeyBuilder::created_at)
    /// - [`id`](PartnerKeyBuilder::id)
    /// - [`name`](PartnerKeyBuilder::name)
    /// - [`permissions`](PartnerKeyBuilder::permissions)
    /// - [`scopes`](PartnerKeyBuilder::scopes)
    /// - [`start`](PartnerKeyBuilder::start)
    pub fn build(self) -> Result<PartnerKey, BuildError> {
        Ok(PartnerKey {
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            expires_at: self.expires_at,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            permissions: self
                .permissions
                .ok_or_else(|| BuildError::missing_field("permissions"))?,
            scopes: self
                .scopes
                .ok_or_else(|| BuildError::missing_field("scopes"))?,
            start: self
                .start
                .ok_or_else(|| BuildError::missing_field("start"))?,
        })
    }
}
