pub use crate::prelude::*;

/// Query parameters for outcome
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OutcomeQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wait: Option<String>,
}

impl OutcomeQueryRequest {
    pub fn builder() -> OutcomeQueryRequestBuilder {
        <OutcomeQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OutcomeQueryRequestBuilder {
    wait: Option<String>,
}

impl OutcomeQueryRequestBuilder {
    pub fn wait(mut self, value: impl Into<String>) -> Self {
        self.wait = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`OutcomeQueryRequest`].
    pub fn build(self) -> Result<OutcomeQueryRequest, BuildError> {
        Ok(OutcomeQueryRequest { wait: self.wait })
    }
}
