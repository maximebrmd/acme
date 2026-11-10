pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostMetrics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clicks: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impressions: Option<i64>,
    #[serde(default)]
    pub likes: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quotes: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reach: Option<i64>,
    #[serde(default)]
    pub replies: i64,
    #[serde(default)]
    pub reposts: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saves: Option<i64>,
}

impl PostMetrics {
    pub fn builder() -> PostMetricsBuilder {
        <PostMetricsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostMetricsBuilder {
    clicks: Option<i64>,
    impressions: Option<i64>,
    likes: Option<i64>,
    quotes: Option<i64>,
    reach: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
    saves: Option<i64>,
}

impl PostMetricsBuilder {
    pub fn clicks(mut self, value: i64) -> Self {
        self.clicks = Some(value);
        self
    }

    pub fn impressions(mut self, value: i64) -> Self {
        self.impressions = Some(value);
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn quotes(mut self, value: i64) -> Self {
        self.quotes = Some(value);
        self
    }

    pub fn reach(mut self, value: i64) -> Self {
        self.reach = Some(value);
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

    pub fn saves(mut self, value: i64) -> Self {
        self.saves = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostMetrics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`likes`](PostMetricsBuilder::likes)
    /// - [`replies`](PostMetricsBuilder::replies)
    /// - [`reposts`](PostMetricsBuilder::reposts)
    pub fn build(self) -> Result<PostMetrics, BuildError> {
        Ok(PostMetrics {
            clicks: self.clicks,
            impressions: self.impressions,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            quotes: self.quotes,
            reach: self.reach,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            reposts: self
                .reposts
                .ok_or_else(|| BuildError::missing_field("reposts"))?,
            saves: self.saves,
        })
    }
}
