pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TopPost {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub engagement: i64,
    #[serde(default)]
    pub metrics: PostMetrics,
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
}

impl TopPost {
    pub fn builder() -> TopPostBuilder {
        <TopPostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TopPostBuilder {
    channel_id: Option<String>,
    engagement: Option<i64>,
    metrics: Option<PostMetrics>,
    permalink: Option<String>,
    post_id: Option<String>,
    published_at: Option<String>,
    target_id: Option<String>,
}

impl TopPostBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn engagement(mut self, value: i64) -> Self {
        self.engagement = Some(value);
        self
    }

    pub fn metrics(mut self, value: PostMetrics) -> Self {
        self.metrics = Some(value);
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

    /// Consumes the builder and constructs a [`TopPost`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](TopPostBuilder::channel_id)
    /// - [`engagement`](TopPostBuilder::engagement)
    /// - [`metrics`](TopPostBuilder::metrics)
    /// - [`post_id`](TopPostBuilder::post_id)
    /// - [`published_at`](TopPostBuilder::published_at)
    /// - [`target_id`](TopPostBuilder::target_id)
    pub fn build(self) -> Result<TopPost, BuildError> {
        Ok(TopPost {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            engagement: self
                .engagement
                .ok_or_else(|| BuildError::missing_field("engagement"))?,
            metrics: self
                .metrics
                .ok_or_else(|| BuildError::missing_field("metrics"))?,
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
        })
    }
}
