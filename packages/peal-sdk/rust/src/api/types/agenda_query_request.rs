pub use crate::prelude::*;

/// Query parameters for agenda
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AgendaQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(default)]
    pub from: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(default)]
    pub to: String,
    #[serde(rename = "workspaceIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_ids: Option<String>,
}

impl AgendaQueryRequest {
    pub fn builder() -> AgendaQueryRequestBuilder {
        <AgendaQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AgendaQueryRequestBuilder {
    cursor: Option<String>,
    from: Option<String>,
    limit: Option<String>,
    to: Option<String>,
    workspace_ids: Option<String>,
}

impl AgendaQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn from(mut self, value: impl Into<String>) -> Self {
        self.from = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn to(mut self, value: impl Into<String>) -> Self {
        self.to = Some(value.into());
        self
    }

    pub fn workspace_ids(mut self, value: impl Into<String>) -> Self {
        self.workspace_ids = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AgendaQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](AgendaQueryRequestBuilder::from)
    /// - [`to`](AgendaQueryRequestBuilder::to)
    pub fn build(self) -> Result<AgendaQueryRequest, BuildError> {
        Ok(AgendaQueryRequest {
            cursor: self.cursor,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            limit: self.limit,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
            workspace_ids: self.workspace_ids,
        })
    }
}
