pub use crate::prelude::*;

/// Query parameters for listWorkspaces
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerListWorkspacesQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    #[serde(rename = "externalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

impl PartnerListWorkspacesQueryRequest {
    pub fn builder() -> PartnerListWorkspacesQueryRequestBuilder {
        <PartnerListWorkspacesQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerListWorkspacesQueryRequestBuilder {
    before: Option<String>,
    external_id: Option<String>,
    limit: Option<String>,
    name: Option<String>,
}

impl PartnerListWorkspacesQueryRequestBuilder {
    pub fn before(mut self, value: impl Into<String>) -> Self {
        self.before = Some(value.into());
        self
    }

    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PartnerListWorkspacesQueryRequest`].
    pub fn build(self) -> Result<PartnerListWorkspacesQueryRequest, BuildError> {
        Ok(PartnerListWorkspacesQueryRequest {
            before: self.before,
            external_id: self.external_id,
            limit: self.limit,
            name: self.name,
        })
    }
}
