pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MetricTotals {
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
}

impl MetricTotals {
    pub fn builder() -> MetricTotalsBuilder {
        <MetricTotalsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MetricTotalsBuilder {
    impressions: Option<i64>,
    likes: Option<i64>,
    posts: Option<i64>,
    quotes: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
}

impl MetricTotalsBuilder {
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

    /// Consumes the builder and constructs a [`MetricTotals`].
    /// This method will fail if any of the following fields are not set:
    /// - [`likes`](MetricTotalsBuilder::likes)
    /// - [`posts`](MetricTotalsBuilder::posts)
    /// - [`replies`](MetricTotalsBuilder::replies)
    /// - [`reposts`](MetricTotalsBuilder::reposts)
    pub fn build(self) -> Result<MetricTotals, BuildError> {
        Ok(MetricTotals {
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
        })
    }
}
