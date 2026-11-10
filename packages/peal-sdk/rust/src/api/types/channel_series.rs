pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelSeries {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub days: Vec<ChannelDay>,
    #[serde(default)]
    pub followers: FollowerChange,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(default)]
    pub to: CalendarDay,
    #[serde(default)]
    pub totals: DashboardTotals,
}

impl ChannelSeries {
    pub fn builder() -> ChannelSeriesBuilder {
        <ChannelSeriesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelSeriesBuilder {
    channel_id: Option<String>,
    days: Option<Vec<ChannelDay>>,
    followers: Option<FollowerChange>,
    from: Option<CalendarDay>,
    platform: Option<Platform>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
    totals: Option<DashboardTotals>,
}

impl ChannelSeriesBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn days(mut self, value: Vec<ChannelDay>) -> Self {
        self.days = Some(value);
        self
    }

    pub fn followers(mut self, value: FollowerChange) -> Self {
        self.followers = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
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

    pub fn totals(mut self, value: DashboardTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelSeries`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ChannelSeriesBuilder::channel_id)
    /// - [`days`](ChannelSeriesBuilder::days)
    /// - [`followers`](ChannelSeriesBuilder::followers)
    /// - [`from`](ChannelSeriesBuilder::from)
    /// - [`time_zone`](ChannelSeriesBuilder::time_zone)
    /// - [`to`](ChannelSeriesBuilder::to)
    /// - [`totals`](ChannelSeriesBuilder::totals)
    pub fn build(self) -> Result<ChannelSeries, BuildError> {
        Ok(ChannelSeries {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            followers: self
                .followers
                .ok_or_else(|| BuildError::missing_field("followers"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            platform: self.platform,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
