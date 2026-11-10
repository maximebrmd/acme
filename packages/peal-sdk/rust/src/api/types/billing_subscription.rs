pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BillingSubscription {
    #[serde(rename = "cancelAtPeriodEnd")]
    #[serde(default)]
    pub cancel_at_period_end: bool,
    #[serde(rename = "currentPeriodEnd")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_period_end: Option<String>,
    #[serde(rename = "endsAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ends_at: Option<String>,
    pub interval: BillingInterval,
    pub plan: PaidPlan,
    #[serde(rename = "startedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    pub status: SubscriptionStatus,
    #[serde(rename = "trialEnd")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_end: Option<String>,
}

impl BillingSubscription {
    pub fn builder() -> BillingSubscriptionBuilder {
        <BillingSubscriptionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BillingSubscriptionBuilder {
    cancel_at_period_end: Option<bool>,
    current_period_end: Option<String>,
    ends_at: Option<String>,
    interval: Option<BillingInterval>,
    plan: Option<PaidPlan>,
    started_at: Option<String>,
    status: Option<SubscriptionStatus>,
    trial_end: Option<String>,
}

impl BillingSubscriptionBuilder {
    pub fn cancel_at_period_end(mut self, value: bool) -> Self {
        self.cancel_at_period_end = Some(value);
        self
    }

    pub fn current_period_end(mut self, value: impl Into<String>) -> Self {
        self.current_period_end = Some(value.into());
        self
    }

    pub fn ends_at(mut self, value: impl Into<String>) -> Self {
        self.ends_at = Some(value.into());
        self
    }

    pub fn interval(mut self, value: BillingInterval) -> Self {
        self.interval = Some(value);
        self
    }

    pub fn plan(mut self, value: PaidPlan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn started_at(mut self, value: impl Into<String>) -> Self {
        self.started_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: SubscriptionStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn trial_end(mut self, value: impl Into<String>) -> Self {
        self.trial_end = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BillingSubscription`].
    /// This method will fail if any of the following fields are not set:
    /// - [`cancel_at_period_end`](BillingSubscriptionBuilder::cancel_at_period_end)
    /// - [`interval`](BillingSubscriptionBuilder::interval)
    /// - [`plan`](BillingSubscriptionBuilder::plan)
    /// - [`status`](BillingSubscriptionBuilder::status)
    pub fn build(self) -> Result<BillingSubscription, BuildError> {
        Ok(BillingSubscription {
            cancel_at_period_end: self
                .cancel_at_period_end
                .ok_or_else(|| BuildError::missing_field("cancel_at_period_end"))?,
            current_period_end: self.current_period_end,
            ends_at: self.ends_at,
            interval: self
                .interval
                .ok_or_else(|| BuildError::missing_field("interval"))?,
            plan: self.plan.ok_or_else(|| BuildError::missing_field("plan"))?,
            started_at: self.started_at,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            trial_end: self.trial_end,
        })
    }
}
