pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BillingSubscription {
    #[serde(rename = "cancelAtPeriodEnd")]
    #[serde(default)]
    pub cancel_at_period_end: bool,
    #[serde(rename = "currentPeriodEnd")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_period_end: Option<String>,
    pub plan: PaidPlan,
    pub status: SubscriptionStatus,
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
    plan: Option<PaidPlan>,
    status: Option<SubscriptionStatus>,
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

    pub fn plan(mut self, value: PaidPlan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn status(mut self, value: SubscriptionStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BillingSubscription`].
    /// This method will fail if any of the following fields are not set:
    /// - [`cancel_at_period_end`](BillingSubscriptionBuilder::cancel_at_period_end)
    /// - [`plan`](BillingSubscriptionBuilder::plan)
    /// - [`status`](BillingSubscriptionBuilder::status)
    pub fn build(self) -> Result<BillingSubscription, BuildError> {
        Ok(BillingSubscription {
            cancel_at_period_end: self
                .cancel_at_period_end
                .ok_or_else(|| BuildError::missing_field("cancel_at_period_end"))?,
            current_period_end: self.current_period_end,
            plan: self.plan.ok_or_else(|| BuildError::missing_field("plan"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
