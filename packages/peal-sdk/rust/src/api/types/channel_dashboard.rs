pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelDashboard {
    #[serde(default)]
    pub followers: FollowerChange,
    #[serde(rename = "previousFollowers")]
    #[serde(default)]
    pub previous_followers: FollowerChange,
    #[serde(rename = "previousTotals")]
    #[serde(default)]
    pub previous_totals: DashboardTotals,
    #[serde(default)]
    pub totals: DashboardTotals,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
}

impl ChannelDashboard {
    pub fn builder() -> ChannelDashboardBuilder {
        <ChannelDashboardBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelDashboardBuilder {
    followers: Option<FollowerChange>,
    previous_followers: Option<FollowerChange>,
    previous_totals: Option<DashboardTotals>,
    totals: Option<DashboardTotals>,
    channel_id: Option<String>,
    platform: Option<Platform>,
}

impl ChannelDashboardBuilder {
    pub fn followers(mut self, value: FollowerChange) -> Self {
        self.followers = Some(value);
        self
    }

    pub fn previous_followers(mut self, value: FollowerChange) -> Self {
        self.previous_followers = Some(value);
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

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelDashboard`].
    /// This method will fail if any of the following fields are not set:
    /// - [`followers`](ChannelDashboardBuilder::followers)
    /// - [`previous_followers`](ChannelDashboardBuilder::previous_followers)
    /// - [`previous_totals`](ChannelDashboardBuilder::previous_totals)
    /// - [`totals`](ChannelDashboardBuilder::totals)
    /// - [`channel_id`](ChannelDashboardBuilder::channel_id)
    pub fn build(self) -> Result<ChannelDashboard, BuildError> {
        Ok(ChannelDashboard {
            followers: self
                .followers
                .ok_or_else(|| BuildError::missing_field("followers"))?,
            previous_followers: self
                .previous_followers
                .ok_or_else(|| BuildError::missing_field("previous_followers"))?,
            previous_totals: self
                .previous_totals
                .ok_or_else(|| BuildError::missing_field("previous_totals"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            platform: self.platform,
        })
    }
}
