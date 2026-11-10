pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AnalyticsDashboard {
    #[serde(default)]
    pub followers: FollowerChange,
    #[serde(rename = "previousFollowers")]
    #[serde(default)]
    pub previous_followers: FollowerChange,
    /// Whether the range before is still all kept. False when a platform's terms keep its numbers for less than the range before goes back (Pinterest 90 days, LinkedIn pages a year): previousTotals and previousFollowers then miss what was deleted, and no change against them should be shown.
    #[serde(rename = "previousKept")]
    #[serde(default)]
    pub previous_kept: bool,
    #[serde(rename = "previousTotals")]
    #[serde(default)]
    pub previous_totals: DashboardTotals,
    #[serde(default)]
    pub totals: DashboardTotals,
    #[serde(default)]
    pub channels: Vec<ChannelDashboard>,
    #[serde(default)]
    pub days: Vec<DashboardDay>,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub platforms: Vec<PlatformDashboard>,
    #[serde(default)]
    pub previous: AnalyticsDashboardPrevious,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(default)]
    pub to: CalendarDay,
    #[serde(rename = "topPosts")]
    #[serde(default)]
    pub top_posts: Vec<TopPost>,
}

impl AnalyticsDashboard {
    pub fn builder() -> AnalyticsDashboardBuilder {
        <AnalyticsDashboardBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AnalyticsDashboardBuilder {
    followers: Option<FollowerChange>,
    previous_followers: Option<FollowerChange>,
    previous_kept: Option<bool>,
    previous_totals: Option<DashboardTotals>,
    totals: Option<DashboardTotals>,
    channels: Option<Vec<ChannelDashboard>>,
    days: Option<Vec<DashboardDay>>,
    from: Option<CalendarDay>,
    platforms: Option<Vec<PlatformDashboard>>,
    previous: Option<AnalyticsDashboardPrevious>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
    top_posts: Option<Vec<TopPost>>,
}

impl AnalyticsDashboardBuilder {
    pub fn followers(mut self, value: FollowerChange) -> Self {
        self.followers = Some(value);
        self
    }

    pub fn previous_followers(mut self, value: FollowerChange) -> Self {
        self.previous_followers = Some(value);
        self
    }

    pub fn previous_kept(mut self, value: bool) -> Self {
        self.previous_kept = Some(value);
        self
    }

    pub fn previous_totals(mut self, value: DashboardTotals) -> Self {
        self.previous_totals = Some(value);
        self
    }

    pub fn totals(mut self, value: DashboardTotals) -> Self {
        self.totals = Some(value);
        self
    }

    pub fn channels(mut self, value: Vec<ChannelDashboard>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn days(mut self, value: Vec<DashboardDay>) -> Self {
        self.days = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn platforms(mut self, value: Vec<PlatformDashboard>) -> Self {
        self.platforms = Some(value);
        self
    }

    pub fn previous(mut self, value: AnalyticsDashboardPrevious) -> Self {
        self.previous = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    pub fn top_posts(mut self, value: Vec<TopPost>) -> Self {
        self.top_posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AnalyticsDashboard`].
    /// This method will fail if any of the following fields are not set:
    /// - [`followers`](AnalyticsDashboardBuilder::followers)
    /// - [`previous_followers`](AnalyticsDashboardBuilder::previous_followers)
    /// - [`previous_kept`](AnalyticsDashboardBuilder::previous_kept)
    /// - [`previous_totals`](AnalyticsDashboardBuilder::previous_totals)
    /// - [`totals`](AnalyticsDashboardBuilder::totals)
    /// - [`channels`](AnalyticsDashboardBuilder::channels)
    /// - [`days`](AnalyticsDashboardBuilder::days)
    /// - [`from`](AnalyticsDashboardBuilder::from)
    /// - [`platforms`](AnalyticsDashboardBuilder::platforms)
    /// - [`previous`](AnalyticsDashboardBuilder::previous)
    /// - [`time_zone`](AnalyticsDashboardBuilder::time_zone)
    /// - [`to`](AnalyticsDashboardBuilder::to)
    /// - [`top_posts`](AnalyticsDashboardBuilder::top_posts)
    pub fn build(self) -> Result<AnalyticsDashboard, BuildError> {
        Ok(AnalyticsDashboard {
            followers: self
                .followers
                .ok_or_else(|| BuildError::missing_field("followers"))?,
            previous_followers: self
                .previous_followers
                .ok_or_else(|| BuildError::missing_field("previous_followers"))?,
            previous_kept: self
                .previous_kept
                .ok_or_else(|| BuildError::missing_field("previous_kept"))?,
            previous_totals: self
                .previous_totals
                .ok_or_else(|| BuildError::missing_field("previous_totals"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            platforms: self
                .platforms
                .ok_or_else(|| BuildError::missing_field("platforms"))?,
            previous: self
                .previous
                .ok_or_else(|| BuildError::missing_field("previous"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
            top_posts: self
                .top_posts
                .ok_or_else(|| BuildError::missing_field("top_posts"))?,
        })
    }
}
