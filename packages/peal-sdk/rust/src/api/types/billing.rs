pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Billing {
    #[serde(default)]
    pub allowances: PlanAllowances,
    #[serde(default)]
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(default)]
    pub plans: Vec<PlanOffer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription: Option<BillingSubscription>,
    #[serde(default)]
    pub usage: Usage,
}

impl Billing {
    pub fn builder() -> BillingBuilder {
        <BillingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BillingBuilder {
    allowances: Option<PlanAllowances>,
    enabled: Option<bool>,
    plan: Option<Plan>,
    plans: Option<Vec<PlanOffer>>,
    subscription: Option<BillingSubscription>,
    usage: Option<Usage>,
}

impl BillingBuilder {
    pub fn allowances(mut self, value: PlanAllowances) -> Self {
        self.allowances = Some(value);
        self
    }

    pub fn enabled(mut self, value: bool) -> Self {
        self.enabled = Some(value);
        self
    }

    pub fn plan(mut self, value: Plan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn plans(mut self, value: Vec<PlanOffer>) -> Self {
        self.plans = Some(value);
        self
    }

    pub fn subscription(mut self, value: BillingSubscription) -> Self {
        self.subscription = Some(value);
        self
    }

    pub fn usage(mut self, value: Usage) -> Self {
        self.usage = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Billing`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowances`](BillingBuilder::allowances)
    /// - [`enabled`](BillingBuilder::enabled)
    /// - [`plans`](BillingBuilder::plans)
    /// - [`usage`](BillingBuilder::usage)
    pub fn build(self) -> Result<Billing, BuildError> {
        Ok(Billing {
            allowances: self
                .allowances
                .ok_or_else(|| BuildError::missing_field("allowances"))?,
            enabled: self
                .enabled
                .ok_or_else(|| BuildError::missing_field("enabled"))?,
            plan: self.plan,
            plans: self
                .plans
                .ok_or_else(|| BuildError::missing_field("plans"))?,
            subscription: self.subscription,
            usage: self
                .usage
                .ok_or_else(|| BuildError::missing_field("usage"))?,
        })
    }
}
