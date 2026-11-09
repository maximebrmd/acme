pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TrialOffer {
    #[serde(default)]
    pub available: bool,
    #[serde(default)]
    pub days: i64,
    pub plan: PaidPlan,
}

impl TrialOffer {
    pub fn builder() -> TrialOfferBuilder {
        <TrialOfferBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TrialOfferBuilder {
    available: Option<bool>,
    days: Option<i64>,
    plan: Option<PaidPlan>,
}

impl TrialOfferBuilder {
    pub fn available(mut self, value: bool) -> Self {
        self.available = Some(value);
        self
    }

    pub fn days(mut self, value: i64) -> Self {
        self.days = Some(value);
        self
    }

    pub fn plan(mut self, value: PaidPlan) -> Self {
        self.plan = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TrialOffer`].
    /// This method will fail if any of the following fields are not set:
    /// - [`available`](TrialOfferBuilder::available)
    /// - [`days`](TrialOfferBuilder::days)
    /// - [`plan`](TrialOfferBuilder::plan)
    pub fn build(self) -> Result<TrialOffer, BuildError> {
        Ok(TrialOffer {
            available: self
                .available
                .ok_or_else(|| BuildError::missing_field("available"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            plan: self.plan.ok_or_else(|| BuildError::missing_field("plan"))?,
        })
    }
}
