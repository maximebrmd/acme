pub use crate::prelude::*;

/// Query parameters for drafts
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct DraftsQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl DraftsQueryRequest {
    pub fn builder() -> DraftsQueryRequestBuilder {
        <DraftsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DraftsQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
}

impl DraftsQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`DraftsQueryRequest`].
    pub fn build(self) -> Result<DraftsQueryRequest, BuildError> {
        Ok(DraftsQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
        })
    }
}
