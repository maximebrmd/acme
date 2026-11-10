pub use crate::prelude::*;

/// Query parameters for auditTrail
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AuditTrailQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

impl AuditTrailQueryRequest {
    pub fn builder() -> AuditTrailQueryRequestBuilder {
        <AuditTrailQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AuditTrailQueryRequestBuilder {
    cursor: Option<String>,
}

impl AuditTrailQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AuditTrailQueryRequest`].
    pub fn build(self) -> Result<AuditTrailQueryRequest, BuildError> {
        Ok(AuditTrailQueryRequest {
            cursor: self.cursor,
        })
    }
}
