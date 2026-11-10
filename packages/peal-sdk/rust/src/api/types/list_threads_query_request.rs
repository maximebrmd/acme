pub use crate::prelude::*;

/// Query parameters for listThreads
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListThreadsQueryRequest {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unanswered: Option<ListThreadsInboxRequestUnanswered>,
}

impl ListThreadsQueryRequest {
    pub fn builder() -> ListThreadsQueryRequestBuilder {
        <ListThreadsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListThreadsQueryRequestBuilder {
    channel_id: Option<String>,
    cursor: Option<String>,
    limit: Option<String>,
    post_id: Option<String>,
    unanswered: Option<ListThreadsInboxRequestUnanswered>,
}

impl ListThreadsQueryRequestBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn unanswered(mut self, value: ListThreadsInboxRequestUnanswered) -> Self {
        self.unanswered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ListThreadsQueryRequest`].
    pub fn build(self) -> Result<ListThreadsQueryRequest, BuildError> {
        Ok(ListThreadsQueryRequest {
            channel_id: self.channel_id,
            cursor: self.cursor,
            limit: self.limit,
            post_id: self.post_id,
            unanswered: self.unanswered,
        })
    }
}
