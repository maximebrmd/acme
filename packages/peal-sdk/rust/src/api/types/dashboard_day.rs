pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct DashboardDay {
    #[serde(default)]
    pub date: CalendarDay,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub followers: Option<i64>,
    #[serde(default)]
    pub likes: i64,
    #[serde(default)]
    pub quotes: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reach: Option<i64>,
    #[serde(default)]
    pub replies: i64,
    #[serde(default)]
    pub reposts: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub views: Option<i64>,
}

impl DashboardDay {
    pub fn builder() -> DashboardDayBuilder {
        <DashboardDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DashboardDayBuilder {
    date: Option<CalendarDay>,
    followers: Option<i64>,
    likes: Option<i64>,
    quotes: Option<i64>,
    reach: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
    views: Option<i64>,
}

impl DashboardDayBuilder {
    pub fn date(mut self, value: CalendarDay) -> Self {
        self.date = Some(value);
        self
    }

    pub fn followers(mut self, value: i64) -> Self {
        self.followers = Some(value);
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

    pub fn views(mut self, value: i64) -> Self {
        self.views = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`DashboardDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`date`](DashboardDayBuilder::date)
    /// - [`likes`](DashboardDayBuilder::likes)
    /// - [`quotes`](DashboardDayBuilder::quotes)
    /// - [`replies`](DashboardDayBuilder::replies)
    /// - [`reposts`](DashboardDayBuilder::reposts)
    pub fn build(self) -> Result<DashboardDay, BuildError> {
        Ok(DashboardDay {
            date: self.date.ok_or_else(|| BuildError::missing_field("date"))?,
            followers: self.followers,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            quotes: self
                .quotes
                .ok_or_else(|| BuildError::missing_field("quotes"))?,
            reach: self.reach,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            reposts: self
                .reposts
                .ok_or_else(|| BuildError::missing_field("reposts"))?,
            views: self.views,
        })
    }
}
