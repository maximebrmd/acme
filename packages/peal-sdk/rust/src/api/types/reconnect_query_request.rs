pub use crate::prelude::*;

/// Query parameters for reconnect
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReconnectQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<ReconnectChannelsRequestMessages>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reposts: Option<ReconnectChannelsRequestReposts>,
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
    reposts: Option<ReconnectChannelsRequestReposts>,
}

impl ReconnectQueryRequestBuilder {
    pub fn messages(mut self, value: ReconnectChannelsRequestMessages) -> Self {
        self.messages = Some(value);
        self
    }

    pub fn reposts(mut self, value: ReconnectChannelsRequestReposts) -> Self {
        self.reposts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReconnectQueryRequest`].
    pub fn build(self) -> Result<ReconnectQueryRequest, BuildError> {
        Ok(ReconnectQueryRequest {
            messages: self.messages,
            reposts: self.reposts,
        })
    }
}
