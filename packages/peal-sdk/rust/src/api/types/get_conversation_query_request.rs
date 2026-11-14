pub use crate::prelude::*;

/// Query parameters for getConversation
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct GetConversationQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl GetConversationQueryRequest {
    pub fn builder() -> GetConversationQueryRequestBuilder {
        <GetConversationQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct GetConversationQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
}

impl GetConversationQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`GetConversationQueryRequest`].
    pub fn build(self) -> Result<GetConversationQueryRequest, BuildError> {
        Ok(GetConversationQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
        })
    }
}
