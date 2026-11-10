pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct DashboardTotals {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clicks: Option<i64>,
    #[serde(default)]
    pub engagement: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impressions: Option<i64>,
    #[serde(default)]
    pub likes: i64,
    #[serde(default)]
    pub posts: i64,
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

impl DashboardTotals {
    pub fn builder() -> DashboardTotalsBuilder {
        <DashboardTotalsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DashboardTotalsBuilder {
    clicks: Option<i64>,
    engagement: Option<i64>,
    impressions: Option<i64>,
    likes: Option<i64>,
    posts: Option<i64>,
    quotes: Option<i64>,
    reach: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
    saves: Option<i64>,
}

impl DashboardTotalsBuilder {
    pub fn clicks(mut self, value: i64) -> Self {
        self.clicks = Some(value);
        self
    }

    pub fn engagement(mut self, value: i64) -> Self {
        self.engagement = Some(value);
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

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
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

    /// Consumes the builder and constructs a [`DashboardTotals`].
    /// This method will fail if any of the following fields are not set:
    /// - [`engagement`](DashboardTotalsBuilder::engagement)
    /// - [`likes`](DashboardTotalsBuilder::likes)
    /// - [`posts`](DashboardTotalsBuilder::posts)
    /// - [`replies`](DashboardTotalsBuilder::replies)
    /// - [`reposts`](DashboardTotalsBuilder::reposts)
    pub fn build(self) -> Result<DashboardTotals, BuildError> {
        Ok(DashboardTotals {
            clicks: self.clicks,
            engagement: self
                .engagement
                .ok_or_else(|| BuildError::missing_field("engagement"))?,
            impressions: self.impressions,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
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
