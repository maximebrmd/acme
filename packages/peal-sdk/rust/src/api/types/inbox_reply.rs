pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxReply {
    #[serde(rename = "authorId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<String>,
    #[serde(rename = "commentId")]
    #[serde(default)]
    pub comment_id: String,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<InboxReplyReason>,
    #[serde(rename = "settledAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settled_at: Option<String>,
    pub status: InboxReplyStatus,
    #[serde(default)]
    pub text: String,
    #[serde(rename = "threadId")]
    #[serde(default)]
    pub thread_id: String,
}

impl InboxReply {
    pub fn builder() -> InboxReplyBuilder {
        <InboxReplyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxReplyBuilder {
    author_id: Option<String>,
    comment_id: Option<String>,
    created_at: Option<String>,
    id: Option<String>,
    permalink: Option<String>,
    reason: Option<InboxReplyReason>,
    settled_at: Option<String>,
    status: Option<InboxReplyStatus>,
    text: Option<String>,
    thread_id: Option<String>,
}

impl InboxReplyBuilder {
    pub fn author_id(mut self, value: impl Into<String>) -> Self {
        self.author_id = Some(value.into());
        self
    }

    pub fn comment_id(mut self, value: impl Into<String>) -> Self {
        self.comment_id = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn reason(mut self, value: InboxReplyReason) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn settled_at(mut self, value: impl Into<String>) -> Self {
        self.settled_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: InboxReplyStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn thread_id(mut self, value: impl Into<String>) -> Self {
        self.thread_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxReply`].
    /// This method will fail if any of the following fields are not set:
    /// - [`comment_id`](InboxReplyBuilder::comment_id)
    /// - [`created_at`](InboxReplyBuilder::created_at)
    /// - [`id`](InboxReplyBuilder::id)
    /// - [`status`](InboxReplyBuilder::status)
    /// - [`text`](InboxReplyBuilder::text)
    /// - [`thread_id`](InboxReplyBuilder::thread_id)
    pub fn build(self) -> Result<InboxReply, BuildError> {
        Ok(InboxReply {
            author_id: self.author_id,
            comment_id: self
                .comment_id
                .ok_or_else(|| BuildError::missing_field("comment_id"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            permalink: self.permalink,
            reason: self.reason,
            settled_at: self.settled_at,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            thread_id: self
                .thread_id
                .ok_or_else(|| BuildError::missing_field("thread_id"))?,
        })
    }
}
