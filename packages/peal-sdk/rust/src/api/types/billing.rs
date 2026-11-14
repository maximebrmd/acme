pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Billing {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account: Option<BillingAccount>,
    #[serde(default)]
    pub accounts: BillingAccountsUsage,
    #[serde(default)]
    pub allowances: PlanAllowances,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimate: Option<Money>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meters: Option<Vec<BillingMeter>>,
    #[serde(rename = "paymentFailed")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_failed: Option<bool>,
    #[serde(rename = "paymentMethod")]
    #[serde(default)]
    pub payment_method: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(default)]
    pub plans: Vec<PlanOffer>,
    #[serde(rename = "rateCard")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rate_card: Option<RateCard>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription: Option<BillingSubscription>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial: Option<TrialOffer>,
    #[serde(rename = "upcomingInvoice")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upcoming_invoice: Option<Money>,
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
    account: Option<BillingAccount>,
    accounts: Option<BillingAccountsUsage>,
    allowances: Option<PlanAllowances>,
    currency: Option<String>,
    enabled: Option<bool>,
    estimate: Option<Money>,
    meters: Option<Vec<BillingMeter>>,
    payment_failed: Option<bool>,
    payment_method: Option<bool>,
    plan: Option<Plan>,
    plans: Option<Vec<PlanOffer>>,
    rate_card: Option<RateCard>,
    subscription: Option<BillingSubscription>,
    trial: Option<TrialOffer>,
    upcoming_invoice: Option<Money>,
    usage: Option<Usage>,
    vat_rate: Option<i64>,
    withdrawable_until: Option<String>,
}

impl BillingBuilder {
    pub fn account(mut self, value: BillingAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn accounts(mut self, value: BillingAccountsUsage) -> Self {
        self.accounts = Some(value);
        self
    }

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

    pub fn estimate(mut self, value: Money) -> Self {
        self.estimate = Some(value);
        self
    }

    pub fn meters(mut self, value: Vec<BillingMeter>) -> Self {
        self.meters = Some(value);
        self
    }

    pub fn payment_failed(mut self, value: bool) -> Self {
        self.payment_failed = Some(value);
        self
    }

    pub fn payment_method(mut self, value: bool) -> Self {
        self.payment_method = Some(value);
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

    pub fn rate_card(mut self, value: RateCard) -> Self {
        self.rate_card = Some(value);
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

    pub fn upcoming_invoice(mut self, value: Money) -> Self {
        self.upcoming_invoice = Some(value);
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
    /// - [`accounts`](BillingBuilder::accounts)
    /// - [`allowances`](BillingBuilder::allowances)
    /// - [`currency`](BillingBuilder::currency)
    /// - [`enabled`](BillingBuilder::enabled)
    /// - [`payment_method`](BillingBuilder::payment_method)
    /// - [`plans`](BillingBuilder::plans)
    /// - [`usage`](BillingBuilder::usage)
    /// - [`vat_rate`](BillingBuilder::vat_rate)
    pub fn build(self) -> Result<Billing, BuildError> {
        Ok(Billing {
            account: self.account,
            accounts: self
                .accounts
                .ok_or_else(|| BuildError::missing_field("accounts"))?,
            allowances: self
                .allowances
                .ok_or_else(|| BuildError::missing_field("allowances"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            enabled: self
                .enabled
                .ok_or_else(|| BuildError::missing_field("enabled"))?,
            estimate: self.estimate,
            meters: self.meters,
            payment_failed: self.payment_failed,
            payment_method: self
                .payment_method
                .ok_or_else(|| BuildError::missing_field("payment_method"))?,
            plan: self.plan,
            plans: self
                .plans
                .ok_or_else(|| BuildError::missing_field("plans"))?,
            rate_card: self.rate_card,
            subscription: self.subscription,
            trial: self.trial,
            upcoming_invoice: self.upcoming_invoice,
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
