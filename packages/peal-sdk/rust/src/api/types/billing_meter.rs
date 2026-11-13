pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BillingMeter {
    #[serde(default)]
    pub allowance: i64,
    #[serde(default)]
    pub billable: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ceiling: Option<Money>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimate: Option<Money>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<SpendGroup>,
    pub meter: Meter,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub most: Option<i64>,
    #[serde(default)]
    pub price: UnitPrice,
    #[serde(rename = "priceConfirmed")]
    #[serde(default)]
    pub price_confirmed: bool,
    #[serde(rename = "resetsAt")]
    #[serde(default)]
    pub resets_at: String,
    #[serde(default)]
    pub used: i64,
}

impl BillingMeter {
    pub fn builder() -> BillingMeterBuilder {
        <BillingMeterBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BillingMeterBuilder {
    allowance: Option<i64>,
    billable: Option<i64>,
    ceiling: Option<Money>,
    estimate: Option<Money>,
    group: Option<SpendGroup>,
    meter: Option<Meter>,
    most: Option<i64>,
    price: Option<UnitPrice>,
    price_confirmed: Option<bool>,
    resets_at: Option<String>,
    used: Option<i64>,
}

impl BillingMeterBuilder {
    pub fn allowance(mut self, value: i64) -> Self {
        self.allowance = Some(value);
        self
    }

    pub fn billable(mut self, value: i64) -> Self {
        self.billable = Some(value);
        self
    }

    pub fn ceiling(mut self, value: Money) -> Self {
        self.ceiling = Some(value);
        self
    }

    pub fn estimate(mut self, value: Money) -> Self {
        self.estimate = Some(value);
        self
    }

    pub fn group(mut self, value: SpendGroup) -> Self {
        self.group = Some(value);
        self
    }

    pub fn meter(mut self, value: Meter) -> Self {
        self.meter = Some(value);
        self
    }

    pub fn most(mut self, value: i64) -> Self {
        self.most = Some(value);
        self
    }

    pub fn price(mut self, value: UnitPrice) -> Self {
        self.price = Some(value);
        self
    }

    pub fn price_confirmed(mut self, value: bool) -> Self {
        self.price_confirmed = Some(value);
        self
    }

    pub fn resets_at(mut self, value: impl Into<String>) -> Self {
        self.resets_at = Some(value.into());
        self
    }

    pub fn used(mut self, value: i64) -> Self {
        self.used = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BillingMeter`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowance`](BillingMeterBuilder::allowance)
    /// - [`billable`](BillingMeterBuilder::billable)
    /// - [`meter`](BillingMeterBuilder::meter)
    /// - [`price`](BillingMeterBuilder::price)
    /// - [`price_confirmed`](BillingMeterBuilder::price_confirmed)
    /// - [`resets_at`](BillingMeterBuilder::resets_at)
    /// - [`used`](BillingMeterBuilder::used)
    pub fn build(self) -> Result<BillingMeter, BuildError> {
        Ok(BillingMeter {
            allowance: self
                .allowance
                .ok_or_else(|| BuildError::missing_field("allowance"))?,
            billable: self
                .billable
                .ok_or_else(|| BuildError::missing_field("billable"))?,
            ceiling: self.ceiling,
            estimate: self.estimate,
            group: self.group,
            meter: self
                .meter
                .ok_or_else(|| BuildError::missing_field("meter"))?,
            most: self.most,
            price: self
                .price
                .ok_or_else(|| BuildError::missing_field("price"))?,
            price_confirmed: self
                .price_confirmed
                .ok_or_else(|| BuildError::missing_field("price_confirmed"))?,
            resets_at: self
                .resets_at
                .ok_or_else(|| BuildError::missing_field("resets_at"))?,
            used: self.used.ok_or_else(|| BuildError::missing_field("used"))?,
        })
    }
}
