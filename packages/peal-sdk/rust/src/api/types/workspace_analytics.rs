pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WorkspaceAnalytics {
    #[serde(default)]
    pub followers: FollowerChange,
    #[serde(rename = "previousFollowers")]
    #[serde(default)]
    pub previous_followers: FollowerChange,
    #[serde(rename = "previousKept")]
    #[serde(default)]
    pub previous_kept: bool,
    #[serde(rename = "previousTotals")]
    #[serde(default)]
    pub previous_totals: DashboardTotals,
    #[serde(default)]
    pub totals: DashboardTotals,
}

impl WorkspaceAnalytics {
    pub fn builder() -> WorkspaceAnalyticsBuilder {
        <WorkspaceAnalyticsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WorkspaceAnalyticsBuilder {
    followers: Option<FollowerChange>,
    previous_followers: Option<FollowerChange>,
    previous_kept: Option<bool>,
    previous_totals: Option<DashboardTotals>,
    totals: Option<DashboardTotals>,
}

impl WorkspaceAnalyticsBuilder {
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

    /// Consumes the builder and constructs a [`WorkspaceAnalytics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`followers`](WorkspaceAnalyticsBuilder::followers)
    /// - [`previous_followers`](WorkspaceAnalyticsBuilder::previous_followers)
    /// - [`previous_kept`](WorkspaceAnalyticsBuilder::previous_kept)
    /// - [`previous_totals`](WorkspaceAnalyticsBuilder::previous_totals)
    /// - [`totals`](WorkspaceAnalyticsBuilder::totals)
    pub fn build(self) -> Result<WorkspaceAnalytics, BuildError> {
        Ok(WorkspaceAnalytics {
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
        })
    }
}
