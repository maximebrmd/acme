pub use crate::prelude::*;

/// Query parameters for listConversations
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListConversationsQueryRequest {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unread: Option<ListConversationsInboxMessagesRequestUnread>,
}

impl ListConversationsQueryRequest {
    pub fn builder() -> ListConversationsQueryRequestBuilder {
        <ListConversationsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListConversationsQueryRequestBuilder {
    channel_id: Option<String>,
    cursor: Option<String>,
    limit: Option<String>,
    unread: Option<ListConversationsInboxMessagesRequestUnread>,
}

impl ListConversationsQueryRequestBuilder {
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

    pub fn unread(mut self, value: ListConversationsInboxMessagesRequestUnread) -> Self {
        self.unread = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ListConversationsQueryRequest`].
    pub fn build(self) -> Result<ListConversationsQueryRequest, BuildError> {
        Ok(ListConversationsQueryRequest {
            channel_id: self.channel_id,
            cursor: self.cursor,
            limit: self.limit,
            unread: self.unread,
        })
    }
}
