pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AssistantMonth {
    #[serde(default)]
    pub allowance: i64,
    #[serde(default)]
    pub ceiling: Money,
    #[serde(default)]
    pub most: i64,
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

impl AssistantMonth {
    pub fn builder() -> AssistantMonthBuilder {
        <AssistantMonthBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantMonthBuilder {
    allowance: Option<i64>,
    ceiling: Option<Money>,
    most: Option<i64>,
    price: Option<UnitPrice>,
    price_confirmed: Option<bool>,
    resets_at: Option<String>,
    used: Option<i64>,
}

impl AssistantMonthBuilder {
    pub fn allowance(mut self, value: i64) -> Self {
        self.allowance = Some(value);
        self
    }

    pub fn ceiling(mut self, value: Money) -> Self {
        self.ceiling = Some(value);
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

    /// Consumes the builder and constructs a [`AssistantMonth`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowance`](AssistantMonthBuilder::allowance)
    /// - [`ceiling`](AssistantMonthBuilder::ceiling)
    /// - [`most`](AssistantMonthBuilder::most)
    /// - [`price`](AssistantMonthBuilder::price)
    /// - [`price_confirmed`](AssistantMonthBuilder::price_confirmed)
    /// - [`resets_at`](AssistantMonthBuilder::resets_at)
    /// - [`used`](AssistantMonthBuilder::used)
    pub fn build(self) -> Result<AssistantMonth, BuildError> {
        Ok(AssistantMonth {
            allowance: self
                .allowance
                .ok_or_else(|| BuildError::missing_field("allowance"))?,
            ceiling: self
                .ceiling
                .ok_or_else(|| BuildError::missing_field("ceiling"))?,
            most: self.most.ok_or_else(|| BuildError::missing_field("most"))?,
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
