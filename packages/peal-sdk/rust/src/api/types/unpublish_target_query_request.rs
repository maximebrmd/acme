pub use crate::prelude::*;

/// Query parameters for unpublishTarget
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnpublishTargetQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wait: Option<String>,
}

impl UnpublishTargetQueryRequest {
    pub fn builder() -> UnpublishTargetQueryRequestBuilder {
        <UnpublishTargetQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnpublishTargetQueryRequestBuilder {
    wait: Option<String>,
}

impl UnpublishTargetQueryRequestBuilder {
    pub fn wait(mut self, value: impl Into<String>) -> Self {
        self.wait = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`UnpublishTargetQueryRequest`].
    pub fn build(self) -> Result<UnpublishTargetQueryRequest, BuildError> {
        Ok(UnpublishTargetQueryRequest { wait: self.wait })
    }
}
