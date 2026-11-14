pub use crate::prelude::*;

/// Query parameters for listReviewThreads
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListReviewThreadsQueryRequest {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unanswered: Option<ListReviewThreadsInboxReviewsRequestUnanswered>,
}

impl ListReviewThreadsQueryRequest {
    pub fn builder() -> ListReviewThreadsQueryRequestBuilder {
        <ListReviewThreadsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListReviewThreadsQueryRequestBuilder {
    channel_id: Option<String>,
    cursor: Option<String>,
    limit: Option<String>,
    unanswered: Option<ListReviewThreadsInboxReviewsRequestUnanswered>,
}

impl ListReviewThreadsQueryRequestBuilder {
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

    pub fn unanswered(mut self, value: ListReviewThreadsInboxReviewsRequestUnanswered) -> Self {
        self.unanswered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ListReviewThreadsQueryRequest`].
    pub fn build(self) -> Result<ListReviewThreadsQueryRequest, BuildError> {
        Ok(ListReviewThreadsQueryRequest {
            channel_id: self.channel_id,
            cursor: self.cursor,
            limit: self.limit,
            unanswered: self.unanswered,
        })
    }
}
