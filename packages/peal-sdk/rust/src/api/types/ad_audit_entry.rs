pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AdAuditEntry {
    #[serde(rename = "accountId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_id: Option<String>,
    pub action: AdAuditAction,
    #[serde(default)]
    pub amounts: HashMap<String, i64>,
    #[serde(default)]
    pub at: String,
    #[serde(rename = "boostId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub boost_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub by: Option<AdAuditEntryBy>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(default)]
    pub id: String,
}

impl AdAuditEntry {
    pub fn builder() -> AdAuditEntryBuilder {
        <AdAuditEntryBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAuditEntryBuilder {
    account_id: Option<String>,
    action: Option<AdAuditAction>,
    amounts: Option<HashMap<String, i64>>,
    at: Option<String>,
    boost_id: Option<String>,
    by: Option<AdAuditEntryBy>,
    currency: Option<String>,
    id: Option<String>,
}

impl AdAuditEntryBuilder {
    pub fn account_id(mut self, value: impl Into<String>) -> Self {
        self.account_id = Some(value.into());
        self
    }

    pub fn action(mut self, value: AdAuditAction) -> Self {
        self.action = Some(value);
        self
    }

    pub fn amounts(mut self, value: HashMap<String, i64>) -> Self {
        self.amounts = Some(value);
        self
    }

    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn boost_id(mut self, value: impl Into<String>) -> Self {
        self.boost_id = Some(value.into());
        self
    }

    pub fn by(mut self, value: AdAuditEntryBy) -> Self {
        self.by = Some(value);
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AdAuditEntry`].
    /// This method will fail if any of the following fields are not set:
    /// - [`action`](AdAuditEntryBuilder::action)
    /// - [`amounts`](AdAuditEntryBuilder::amounts)
    /// - [`at`](AdAuditEntryBuilder::at)
    /// - [`id`](AdAuditEntryBuilder::id)
    pub fn build(self) -> Result<AdAuditEntry, BuildError> {
        Ok(AdAuditEntry {
            account_id: self.account_id,
            action: self
                .action
                .ok_or_else(|| BuildError::missing_field("action"))?,
            amounts: self
                .amounts
                .ok_or_else(|| BuildError::missing_field("amounts"))?,
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            boost_id: self.boost_id,
            by: self.by,
            currency: self.currency,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
        })
    }
}
