pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdConnection {
    pub access: AdAccess,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "expiresAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    #[serde(rename = "grantedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub granted_by: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "maySpend")]
    #[serde(default)]
    pub may_spend: bool,
    pub network: AdNetwork,
}

impl AdConnection {
    pub fn builder() -> AdConnectionBuilder {
        <AdConnectionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdConnectionBuilder {
    access: Option<AdAccess>,
    created_at: Option<String>,
    expires_at: Option<String>,
    granted_by: Option<String>,
    id: Option<String>,
    may_spend: Option<bool>,
    network: Option<AdNetwork>,
}

impl AdConnectionBuilder {
    pub fn access(mut self, value: AdAccess) -> Self {
        self.access = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn expires_at(mut self, value: impl Into<String>) -> Self {
        self.expires_at = Some(value.into());
        self
    }

    pub fn granted_by(mut self, value: impl Into<String>) -> Self {
        self.granted_by = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn may_spend(mut self, value: bool) -> Self {
        self.may_spend = Some(value);
        self
    }

    pub fn network(mut self, value: AdNetwork) -> Self {
        self.network = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdConnection`].
    /// This method will fail if any of the following fields are not set:
    /// - [`access`](AdConnectionBuilder::access)
    /// - [`created_at`](AdConnectionBuilder::created_at)
    /// - [`id`](AdConnectionBuilder::id)
    /// - [`may_spend`](AdConnectionBuilder::may_spend)
    /// - [`network`](AdConnectionBuilder::network)
    pub fn build(self) -> Result<AdConnection, BuildError> {
        Ok(AdConnection {
            access: self
                .access
                .ok_or_else(|| BuildError::missing_field("access"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            expires_at: self.expires_at,
            granted_by: self.granted_by,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            may_spend: self
                .may_spend
                .ok_or_else(|| BuildError::missing_field("may_spend"))?,
            network: self
                .network
                .ok_or_else(|| BuildError::missing_field("network"))?,
        })
    }
}
