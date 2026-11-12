pub use crate::prelude::*;

/// Query parameters for get
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OverviewGetQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl OverviewGetQueryRequest {
    pub fn builder() -> OverviewGetQueryRequestBuilder {
        <OverviewGetQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OverviewGetQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
}

impl OverviewGetQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`OverviewGetQueryRequest`].
    pub fn build(self) -> Result<OverviewGetQueryRequest, BuildError> {
        Ok(OverviewGetQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
        })
    }
}
