pub use crate::prelude::*;

/// Query parameters for overview
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerAccountOverviewQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl PartnerAccountOverviewQueryRequest {
    pub fn builder() -> PartnerAccountOverviewQueryRequestBuilder {
        <PartnerAccountOverviewQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerAccountOverviewQueryRequestBuilder {
    before: Option<String>,
    limit: Option<String>,
}

impl PartnerAccountOverviewQueryRequestBuilder {
    pub fn before(mut self, value: impl Into<String>) -> Self {
        self.before = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PartnerAccountOverviewQueryRequest`].
    pub fn build(self) -> Result<PartnerAccountOverviewQueryRequest, BuildError> {
        Ok(PartnerAccountOverviewQueryRequest {
            before: self.before,
            limit: self.limit,
        })
    }
}
