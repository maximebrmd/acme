pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Overview {
    #[serde(rename = "generatedAt")]
    #[serde(default)]
    pub generated_at: String,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
    #[serde(default)]
    pub workspaces: Vec<WorkspaceOverview>,
}

impl Overview {
    pub fn builder() -> OverviewBuilder {
        <OverviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OverviewBuilder {
    generated_at: Option<String>,
    next_cursor: Option<String>,
    workspaces: Option<Vec<WorkspaceOverview>>,
}

impl OverviewBuilder {
    pub fn generated_at(mut self, value: impl Into<String>) -> Self {
        self.generated_at = Some(value.into());
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    pub fn workspaces(mut self, value: Vec<WorkspaceOverview>) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Overview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`generated_at`](OverviewBuilder::generated_at)
    /// - [`workspaces`](OverviewBuilder::workspaces)
    pub fn build(self) -> Result<Overview, BuildError> {
        Ok(Overview {
            generated_at: self
                .generated_at
                .ok_or_else(|| BuildError::missing_field("generated_at"))?,
            next_cursor: self.next_cursor,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
