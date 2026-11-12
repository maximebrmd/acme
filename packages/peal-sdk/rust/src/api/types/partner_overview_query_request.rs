pub use crate::prelude::*;

/// Query parameters for overview
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerOverviewQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl PartnerOverviewQueryRequest {
    pub fn builder() -> PartnerOverviewQueryRequestBuilder {
        <PartnerOverviewQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerOverviewQueryRequestBuilder {
    before: Option<String>,
    limit: Option<String>,
}

impl PartnerOverviewQueryRequestBuilder {
    pub fn before(mut self, value: impl Into<String>) -> Self {
        self.before = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PartnerOverviewQueryRequest`].
    pub fn build(self) -> Result<PartnerOverviewQueryRequest, BuildError> {
        Ok(PartnerOverviewQueryRequest {
            before: self.before,
            limit: self.limit,
        })
    }
}
