pub use crate::prelude::*;

/// Query parameters for reconnect
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReconnectQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<ReconnectChannelsRequestMessages>,
}

impl ReconnectQueryRequest {
    pub fn builder() -> ReconnectQueryRequestBuilder {
        <ReconnectQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReconnectQueryRequestBuilder {
    messages: Option<ReconnectChannelsRequestMessages>,
}

impl ReconnectQueryRequestBuilder {
    pub fn messages(mut self, value: ReconnectChannelsRequestMessages) -> Self {
        self.messages = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReconnectQueryRequest`].
    pub fn build(self) -> Result<ReconnectQueryRequest, BuildError> {
        Ok(ReconnectQueryRequest {
            messages: self.messages,
        })
    }
}
