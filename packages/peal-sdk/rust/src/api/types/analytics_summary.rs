pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AnalyticsSummary {
    #[serde(default)]
    pub channels: Vec<ChannelMetrics>,
    #[serde(default)]
    pub days: Vec<EngagementDay>,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(default)]
    pub to: CalendarDay,
    #[serde(rename = "topPosts")]
    #[serde(default)]
    pub top_posts: Vec<TopPost>,
    #[serde(default)]
    pub totals: MetricTotals,
}

impl AnalyticsSummary {
    pub fn builder() -> AnalyticsSummaryBuilder {
        <AnalyticsSummaryBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AnalyticsSummaryBuilder {
    channels: Option<Vec<ChannelMetrics>>,
    days: Option<Vec<EngagementDay>>,
    from: Option<CalendarDay>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
    top_posts: Option<Vec<TopPost>>,
    totals: Option<MetricTotals>,
}

impl AnalyticsSummaryBuilder {
    pub fn channels(mut self, value: Vec<ChannelMetrics>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn days(mut self, value: Vec<EngagementDay>) -> Self {
        self.days = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
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

    pub fn totals(mut self, value: MetricTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AnalyticsSummary`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](AnalyticsSummaryBuilder::channels)
    /// - [`days`](AnalyticsSummaryBuilder::days)
    /// - [`from`](AnalyticsSummaryBuilder::from)
    /// - [`time_zone`](AnalyticsSummaryBuilder::time_zone)
    /// - [`to`](AnalyticsSummaryBuilder::to)
    /// - [`top_posts`](AnalyticsSummaryBuilder::top_posts)
    /// - [`totals`](AnalyticsSummaryBuilder::totals)
    pub fn build(self) -> Result<AnalyticsSummary, BuildError> {
        Ok(AnalyticsSummary {
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
            top_posts: self
                .top_posts
                .ok_or_else(|| BuildError::missing_field("top_posts"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
