pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxComment {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<InboxAuthor>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub liked: bool,
    #[serde(rename = "parentId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(rename = "receivedAt")]
    #[serde(default)]
    pub received_at: String,
    pub state: InboxCommentState,
    #[serde(default)]
    pub text: String,
    #[serde(rename = "threadId")]
    #[serde(default)]
    pub thread_id: String,
    #[serde(rename = "writtenAt")]
    #[serde(default)]
    pub written_at: String,
}

impl InboxComment {
    pub fn builder() -> InboxCommentBuilder {
        <InboxCommentBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxCommentBuilder {
    author: Option<InboxAuthor>,
    id: Option<String>,
    liked: Option<bool>,
    parent_id: Option<String>,
    permalink: Option<String>,
    received_at: Option<String>,
    state: Option<InboxCommentState>,
    text: Option<String>,
    thread_id: Option<String>,
    written_at: Option<String>,
}

impl InboxCommentBuilder {
    pub fn author(mut self, value: InboxAuthor) -> Self {
        self.author = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn liked(mut self, value: bool) -> Self {
        self.liked = Some(value);
        self
    }

    pub fn parent_id(mut self, value: impl Into<String>) -> Self {
        self.parent_id = Some(value.into());
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn received_at(mut self, value: impl Into<String>) -> Self {
        self.received_at = Some(value.into());
        self
    }

    pub fn state(mut self, value: InboxCommentState) -> Self {
        self.state = Some(value);
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

    pub fn written_at(mut self, value: impl Into<String>) -> Self {
        self.written_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxComment`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](InboxCommentBuilder::id)
    /// - [`liked`](InboxCommentBuilder::liked)
    /// - [`received_at`](InboxCommentBuilder::received_at)
    /// - [`state`](InboxCommentBuilder::state)
    /// - [`text`](InboxCommentBuilder::text)
    /// - [`thread_id`](InboxCommentBuilder::thread_id)
    /// - [`written_at`](InboxCommentBuilder::written_at)
    pub fn build(self) -> Result<InboxComment, BuildError> {
        Ok(InboxComment {
            author: self.author,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            liked: self
                .liked
                .ok_or_else(|| BuildError::missing_field("liked"))?,
            parent_id: self.parent_id,
            permalink: self.permalink,
            received_at: self
                .received_at
                .ok_or_else(|| BuildError::missing_field("received_at"))?,
            state: self
                .state
                .ok_or_else(|| BuildError::missing_field("state"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            thread_id: self
                .thread_id
                .ok_or_else(|| BuildError::missing_field("thread_id"))?,
            written_at: self
                .written_at
                .ok_or_else(|| BuildError::missing_field("written_at"))?,
        })
    }
}
