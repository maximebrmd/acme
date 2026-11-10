pub use crate::prelude::*;

/// Query parameters for listWorkspaces
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerAccountListWorkspacesQueryRequest {
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

impl PartnerAccountListWorkspacesQueryRequest {
    pub fn builder() -> PartnerAccountListWorkspacesQueryRequestBuilder {
        <PartnerAccountListWorkspacesQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerAccountListWorkspacesQueryRequestBuilder {
    before: Option<String>,
    external_id: Option<String>,
    limit: Option<String>,
    name: Option<String>,
}

impl PartnerAccountListWorkspacesQueryRequestBuilder {
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

    /// Consumes the builder and constructs a [`PartnerAccountListWorkspacesQueryRequest`].
    pub fn build(self) -> Result<PartnerAccountListWorkspacesQueryRequest, BuildError> {
        Ok(PartnerAccountListWorkspacesQueryRequest {
            before: self.before,
            external_id: self.external_id,
            limit: self.limit,
            name: self.name,
        })
    }
}
