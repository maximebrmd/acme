pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OverviewPosts {
    #[serde(rename = "awaitingApproval")]
    #[serde(default)]
    pub awaiting_approval: i64,
    #[serde(rename = "failedLast7Days")]
    #[serde(default)]
    pub failed_last7days: i64,
    #[serde(rename = "mayApprove")]
    #[serde(default)]
    pub may_approve: bool,
    #[serde(rename = "scheduledNext7Days")]
    #[serde(default)]
    pub scheduled_next7days: i64,
    #[serde(rename = "unconfirmedLast7Days")]
    #[serde(default)]
    pub unconfirmed_last7days: i64,
}

impl OverviewPosts {
    pub fn builder() -> OverviewPostsBuilder {
        <OverviewPostsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OverviewPostsBuilder {
    awaiting_approval: Option<i64>,
    failed_last7days: Option<i64>,
    may_approve: Option<bool>,
    scheduled_next7days: Option<i64>,
    unconfirmed_last7days: Option<i64>,
}

impl OverviewPostsBuilder {
    pub fn awaiting_approval(mut self, value: i64) -> Self {
        self.awaiting_approval = Some(value);
        self
    }

    pub fn failed_last7days(mut self, value: i64) -> Self {
        self.failed_last7days = Some(value);
        self
    }

    pub fn may_approve(mut self, value: bool) -> Self {
        self.may_approve = Some(value);
        self
    }

    pub fn scheduled_next7days(mut self, value: i64) -> Self {
        self.scheduled_next7days = Some(value);
        self
    }

    pub fn unconfirmed_last7days(mut self, value: i64) -> Self {
        self.unconfirmed_last7days = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`OverviewPosts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`awaiting_approval`](OverviewPostsBuilder::awaiting_approval)
    /// - [`failed_last7days`](OverviewPostsBuilder::failed_last7days)
    /// - [`may_approve`](OverviewPostsBuilder::may_approve)
    /// - [`scheduled_next7days`](OverviewPostsBuilder::scheduled_next7days)
    /// - [`unconfirmed_last7days`](OverviewPostsBuilder::unconfirmed_last7days)
    pub fn build(self) -> Result<OverviewPosts, BuildError> {
        Ok(OverviewPosts {
            awaiting_approval: self
                .awaiting_approval
                .ok_or_else(|| BuildError::missing_field("awaiting_approval"))?,
            failed_last7days: self
                .failed_last7days
                .ok_or_else(|| BuildError::missing_field("failed_last7days"))?,
            may_approve: self
                .may_approve
                .ok_or_else(|| BuildError::missing_field("may_approve"))?,
            scheduled_next7days: self
                .scheduled_next7days
                .ok_or_else(|| BuildError::missing_field("scheduled_next7days"))?,
            unconfirmed_last7days: self
                .unconfirmed_last7days
                .ok_or_else(|| BuildError::missing_field("unconfirmed_last7days"))?,
        })
    }
}
