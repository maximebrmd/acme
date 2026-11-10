pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxThread {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(rename = "collectionEnded")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_ended: Option<InboxCollectionEnd>,
    #[serde(default)]
    pub comments: i64,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "lastCollectedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_collected_at: Option<String>,
    #[serde(rename = "lastCommentAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_comment_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "publishedAt")]
    #[serde(default)]
    pub published_at: String,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
    #[serde(default)]
    pub unanswered: i64,
}

impl InboxThread {
    pub fn builder() -> InboxThreadBuilder {
        <InboxThreadBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxThreadBuilder {
    channel_id: Option<String>,
    collection_ended: Option<InboxCollectionEnd>,
    comments: Option<i64>,
    id: Option<String>,
    last_collected_at: Option<String>,
    last_comment_at: Option<String>,
    permalink: Option<String>,
    post_id: Option<String>,
    published_at: Option<String>,
    target_id: Option<String>,
    unanswered: Option<i64>,
}

impl InboxThreadBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn collection_ended(mut self, value: InboxCollectionEnd) -> Self {
        self.collection_ended = Some(value);
        self
    }

    pub fn comments(mut self, value: i64) -> Self {
        self.comments = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn last_collected_at(mut self, value: impl Into<String>) -> Self {
        self.last_collected_at = Some(value.into());
        self
    }

    pub fn last_comment_at(mut self, value: impl Into<String>) -> Self {
        self.last_comment_at = Some(value.into());
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn published_at(mut self, value: impl Into<String>) -> Self {
        self.published_at = Some(value.into());
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    pub fn unanswered(mut self, value: i64) -> Self {
        self.unanswered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxThread`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](InboxThreadBuilder::channel_id)
    /// - [`comments`](InboxThreadBuilder::comments)
    /// - [`id`](InboxThreadBuilder::id)
    /// - [`post_id`](InboxThreadBuilder::post_id)
    /// - [`published_at`](InboxThreadBuilder::published_at)
    /// - [`target_id`](InboxThreadBuilder::target_id)
    /// - [`unanswered`](InboxThreadBuilder::unanswered)
    pub fn build(self) -> Result<InboxThread, BuildError> {
        Ok(InboxThread {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            collection_ended: self.collection_ended,
            comments: self
                .comments
                .ok_or_else(|| BuildError::missing_field("comments"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            last_collected_at: self.last_collected_at,
            last_comment_at: self.last_comment_at,
            permalink: self.permalink,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            published_at: self
                .published_at
                .ok_or_else(|| BuildError::missing_field("published_at"))?,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
            unanswered: self
                .unanswered
                .ok_or_else(|| BuildError::missing_field("unanswered"))?,
        })
    }
}
