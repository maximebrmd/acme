pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CustomerWorkspacePage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<String>,
    #[serde(default)]
    pub total: i64,
    #[serde(default)]
    pub workspaces: Vec<CustomerWorkspace>,
}

impl CustomerWorkspacePage {
    pub fn builder() -> CustomerWorkspacePageBuilder {
        <CustomerWorkspacePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CustomerWorkspacePageBuilder {
    next: Option<String>,
    total: Option<i64>,
    workspaces: Option<Vec<CustomerWorkspace>>,
}

impl CustomerWorkspacePageBuilder {
    pub fn next(mut self, value: impl Into<String>) -> Self {
        self.next = Some(value.into());
        self
    }

    pub fn total(mut self, value: i64) -> Self {
        self.total = Some(value);
        self
    }

    pub fn workspaces(mut self, value: Vec<CustomerWorkspace>) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CustomerWorkspacePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`total`](CustomerWorkspacePageBuilder::total)
    /// - [`workspaces`](CustomerWorkspacePageBuilder::workspaces)
    pub fn build(self) -> Result<CustomerWorkspacePage, BuildError> {
        Ok(CustomerWorkspacePage {
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
