pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TenantUsagePage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<String>,
    #[serde(default)]
    pub total: i64,
    #[serde(default)]
    pub workspaces: Vec<TenantUsage>,
}

impl TenantUsagePage {
    pub fn builder() -> TenantUsagePageBuilder {
        <TenantUsagePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TenantUsagePageBuilder {
    next: Option<String>,
    total: Option<i64>,
    workspaces: Option<Vec<TenantUsage>>,
}

impl TenantUsagePageBuilder {
    pub fn next(mut self, value: impl Into<String>) -> Self {
        self.next = Some(value.into());
        self
    }

    pub fn total(mut self, value: i64) -> Self {
        self.total = Some(value);
        self
    }

    pub fn workspaces(mut self, value: Vec<TenantUsage>) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TenantUsagePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`total`](TenantUsagePageBuilder::total)
    /// - [`workspaces`](TenantUsagePageBuilder::workspaces)
    pub fn build(self) -> Result<TenantUsagePage, BuildError> {
        Ok(TenantUsagePage {
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
