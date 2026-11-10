pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlatformDashboard {
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
    pub platform: Platform,
}

impl PlatformDashboard {
    pub fn builder() -> PlatformDashboardBuilder {
        <PlatformDashboardBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformDashboardBuilder {
    followers: Option<FollowerChange>,
    previous_followers: Option<FollowerChange>,
    previous_totals: Option<DashboardTotals>,
    totals: Option<DashboardTotals>,
    platform: Option<Platform>,
}

impl PlatformDashboardBuilder {
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

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformDashboard`].
    /// This method will fail if any of the following fields are not set:
    /// - [`followers`](PlatformDashboardBuilder::followers)
    /// - [`previous_followers`](PlatformDashboardBuilder::previous_followers)
    /// - [`previous_totals`](PlatformDashboardBuilder::previous_totals)
    /// - [`totals`](PlatformDashboardBuilder::totals)
    /// - [`platform`](PlatformDashboardBuilder::platform)
    pub fn build(self) -> Result<PlatformDashboard, BuildError> {
        Ok(PlatformDashboard {
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
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
        })
    }
}
