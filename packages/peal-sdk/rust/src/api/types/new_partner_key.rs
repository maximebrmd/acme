pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewPartnerKey {
    #[serde(rename = "expiresInDays")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in_days: Option<i64>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<Permission>,
    #[serde(default)]
    pub scopes: Vec<PartnerScope>,
}

impl NewPartnerKey {
    pub fn builder() -> NewPartnerKeyBuilder {
        <NewPartnerKeyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewPartnerKeyBuilder {
    expires_in_days: Option<i64>,
    name: Option<String>,
    permissions: Option<Vec<Permission>>,
    scopes: Option<Vec<PartnerScope>>,
}

impl NewPartnerKeyBuilder {
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

    pub fn scopes(mut self, value: Vec<PartnerScope>) -> Self {
        self.scopes = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewPartnerKey`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](NewPartnerKeyBuilder::name)
    /// - [`permissions`](NewPartnerKeyBuilder::permissions)
    /// - [`scopes`](NewPartnerKeyBuilder::scopes)
    pub fn build(self) -> Result<NewPartnerKey, BuildError> {
        Ok(NewPartnerKey {
            expires_in_days: self.expires_in_days,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            permissions: self
                .permissions
                .ok_or_else(|| BuildError::missing_field("permissions"))?,
            scopes: self
                .scopes
                .ok_or_else(|| BuildError::missing_field("scopes"))?,
        })
    }
}
