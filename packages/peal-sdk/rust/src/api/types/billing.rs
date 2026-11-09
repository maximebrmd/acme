pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Billing {
    #[serde(default)]
    pub allowances: PlanAllowances,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(default)]
    pub plans: Vec<PlanOffer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription: Option<BillingSubscription>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial: Option<TrialOffer>,
    #[serde(default)]
    pub usage: Usage,
    #[serde(rename = "vatRate")]
    #[serde(default)]
    pub vat_rate: i64,
    #[serde(rename = "withdrawableUntil")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub withdrawable_until: Option<String>,
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
    currency: Option<String>,
    enabled: Option<bool>,
    plan: Option<Plan>,
    plans: Option<Vec<PlanOffer>>,
    subscription: Option<BillingSubscription>,
    trial: Option<TrialOffer>,
    usage: Option<Usage>,
    vat_rate: Option<i64>,
    withdrawable_until: Option<String>,
}

impl BillingBuilder {
    pub fn allowances(mut self, value: PlanAllowances) -> Self {
        self.allowances = Some(value);
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
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

    pub fn trial(mut self, value: TrialOffer) -> Self {
        self.trial = Some(value);
        self
    }

    pub fn usage(mut self, value: Usage) -> Self {
        self.usage = Some(value);
        self
    }

    pub fn vat_rate(mut self, value: i64) -> Self {
        self.vat_rate = Some(value);
        self
    }

    pub fn withdrawable_until(mut self, value: impl Into<String>) -> Self {
        self.withdrawable_until = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Billing`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowances`](BillingBuilder::allowances)
    /// - [`currency`](BillingBuilder::currency)
    /// - [`enabled`](BillingBuilder::enabled)
    /// - [`plans`](BillingBuilder::plans)
    /// - [`usage`](BillingBuilder::usage)
    /// - [`vat_rate`](BillingBuilder::vat_rate)
    pub fn build(self) -> Result<Billing, BuildError> {
        Ok(Billing {
            allowances: self
                .allowances
                .ok_or_else(|| BuildError::missing_field("allowances"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            enabled: self
                .enabled
                .ok_or_else(|| BuildError::missing_field("enabled"))?,
            plan: self.plan,
            plans: self
                .plans
                .ok_or_else(|| BuildError::missing_field("plans"))?,
            subscription: self.subscription,
            trial: self.trial,
            usage: self
                .usage
                .ok_or_else(|| BuildError::missing_field("usage"))?,
            vat_rate: self
                .vat_rate
                .ok_or_else(|| BuildError::missing_field("vat_rate"))?,
            withdrawable_until: self.withdrawable_until,
        })
    }
}
