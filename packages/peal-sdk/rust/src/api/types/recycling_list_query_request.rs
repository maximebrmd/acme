pub use crate::prelude::*;

/// Query parameters for list
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingListQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<RecyclingStatus>,
}

impl RecyclingListQueryRequest {
    pub fn builder() -> RecyclingListQueryRequestBuilder {
        <RecyclingListQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingListQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
    status: Option<RecyclingStatus>,
}

impl RecyclingListQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn status(mut self, value: RecyclingStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingListQueryRequest`].
    pub fn build(self) -> Result<RecyclingListQueryRequest, BuildError> {
        Ok(RecyclingListQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
            status: self.status,
        })
    }
}
