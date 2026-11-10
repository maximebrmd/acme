pub use crate::prelude::*;

/// Query parameters for listDeliveries
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListDeliveriesQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl ListDeliveriesQueryRequest {
    pub fn builder() -> ListDeliveriesQueryRequestBuilder {
        <ListDeliveriesQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListDeliveriesQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
}

impl ListDeliveriesQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ListDeliveriesQueryRequest`].
    pub fn build(self) -> Result<ListDeliveriesQueryRequest, BuildError> {
        Ok(ListDeliveriesQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
        })
    }
}
