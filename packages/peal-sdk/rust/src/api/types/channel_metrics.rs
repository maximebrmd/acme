pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelMetrics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impressions: Option<i64>,
    #[serde(default)]
    pub likes: i64,
    #[serde(default)]
    pub posts: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quotes: Option<i64>,
    #[serde(default)]
    pub replies: i64,
    #[serde(default)]
    pub reposts: i64,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
}

impl ChannelMetrics {
    pub fn builder() -> ChannelMetricsBuilder {
        <ChannelMetricsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelMetricsBuilder {
    impressions: Option<i64>,
    likes: Option<i64>,
    posts: Option<i64>,
    quotes: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
    channel_id: Option<String>,
}

impl ChannelMetricsBuilder {
    pub fn impressions(mut self, value: i64) -> Self {
        self.impressions = Some(value);
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
        self
    }

    pub fn quotes(mut self, value: i64) -> Self {
        self.quotes = Some(value);
        self
    }

    pub fn replies(mut self, value: i64) -> Self {
        self.replies = Some(value);
        self
    }

    pub fn reposts(mut self, value: i64) -> Self {
        self.reposts = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChannelMetrics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`likes`](ChannelMetricsBuilder::likes)
    /// - [`posts`](ChannelMetricsBuilder::posts)
    /// - [`replies`](ChannelMetricsBuilder::replies)
    /// - [`reposts`](ChannelMetricsBuilder::reposts)
    /// - [`channel_id`](ChannelMetricsBuilder::channel_id)
    pub fn build(self) -> Result<ChannelMetrics, BuildError> {
        Ok(ChannelMetrics {
            impressions: self.impressions,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
            quotes: self.quotes,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            reposts: self
                .reposts
                .ok_or_else(|| BuildError::missing_field("reposts"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
        })
    }
}
