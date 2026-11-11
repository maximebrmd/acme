pub use crate::prelude::*;

/// Query parameters for slots
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SlotsQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<String>,
}

impl SlotsQueryRequest {
    pub fn builder() -> SlotsQueryRequestBuilder {
        <SlotsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SlotsQueryRequestBuilder {
    count: Option<String>,
}

impl SlotsQueryRequestBuilder {
    pub fn count(mut self, value: impl Into<String>) -> Self {
        self.count = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SlotsQueryRequest`].
    pub fn build(self) -> Result<SlotsQueryRequest, BuildError> {
        Ok(SlotsQueryRequest { count: self.count })
    }
}
