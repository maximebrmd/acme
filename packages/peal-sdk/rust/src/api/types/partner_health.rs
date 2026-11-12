pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerHealth {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account: Option<PartnerHealthAccount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<String>,
    #[serde(default)]
    pub total: i64,
    #[serde(default)]
    pub workspaces: Vec<CustomerHealth>,
}

impl PartnerHealth {
    pub fn builder() -> PartnerHealthBuilder {
        <PartnerHealthBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerHealthBuilder {
    account: Option<PartnerHealthAccount>,
    next: Option<String>,
    total: Option<i64>,
    workspaces: Option<Vec<CustomerHealth>>,
}

impl PartnerHealthBuilder {
    pub fn account(mut self, value: PartnerHealthAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn next(mut self, value: impl Into<String>) -> Self {
        self.next = Some(value.into());
        self
    }

    pub fn total(mut self, value: i64) -> Self {
        self.total = Some(value);
        self
    }

    pub fn workspaces(mut self, value: Vec<CustomerHealth>) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerHealth`].
    /// This method will fail if any of the following fields are not set:
    /// - [`total`](PartnerHealthBuilder::total)
    /// - [`workspaces`](PartnerHealthBuilder::workspaces)
    pub fn build(self) -> Result<PartnerHealth, BuildError> {
        Ok(PartnerHealth {
            account: self.account,
            next: self.next,
            total: self
                .total
                .ok_or_else(|| BuildError::missing_field("total"))?,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
