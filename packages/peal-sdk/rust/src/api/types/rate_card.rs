pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCard {
    #[serde(rename = "apiRequestsPerMinute")]
    #[serde(default)]
    pub api_requests_per_minute: RateCardApiRequestsPerMinute,
    #[serde(default)]
    pub assistant: RateCardAssistant,
    #[serde(rename = "daysPerMonth")]
    #[serde(default)]
    pub days_per_month: i64,
    #[serde(rename = "displayVatRate")]
    #[serde(default)]
    pub display_vat_rate: i64,
    #[serde(default)]
    pub meters: RateCardMeters,
    #[serde(default)]
    pub prices: RateCardPrices,
    #[serde(default)]
    pub storage: RateCardStorage,
    #[serde(rename = "unverifiedCeiling")]
    #[serde(default)]
    pub unverified_ceiling: i64,
    #[serde(default)]
    pub x: RateCardX,
}

impl RateCard {
    pub fn builder() -> RateCardBuilder {
        <RateCardBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardBuilder {
    api_requests_per_minute: Option<RateCardApiRequestsPerMinute>,
    assistant: Option<RateCardAssistant>,
    days_per_month: Option<i64>,
    display_vat_rate: Option<i64>,
    meters: Option<RateCardMeters>,
    prices: Option<RateCardPrices>,
    storage: Option<RateCardStorage>,
    unverified_ceiling: Option<i64>,
    x: Option<RateCardX>,
}

impl RateCardBuilder {
    pub fn api_requests_per_minute(mut self, value: RateCardApiRequestsPerMinute) -> Self {
        self.api_requests_per_minute = Some(value);
        self
    }

    pub fn assistant(mut self, value: RateCardAssistant) -> Self {
        self.assistant = Some(value);
        self
    }

    pub fn days_per_month(mut self, value: i64) -> Self {
        self.days_per_month = Some(value);
        self
    }

    pub fn display_vat_rate(mut self, value: i64) -> Self {
        self.display_vat_rate = Some(value);
        self
    }

    pub fn meters(mut self, value: RateCardMeters) -> Self {
        self.meters = Some(value);
        self
    }

    pub fn prices(mut self, value: RateCardPrices) -> Self {
        self.prices = Some(value);
        self
    }

    pub fn storage(mut self, value: RateCardStorage) -> Self {
        self.storage = Some(value);
        self
    }

    pub fn unverified_ceiling(mut self, value: i64) -> Self {
        self.unverified_ceiling = Some(value);
        self
    }

    pub fn x(mut self, value: RateCardX) -> Self {
        self.x = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCard`].
    /// This method will fail if any of the following fields are not set:
    /// - [`api_requests_per_minute`](RateCardBuilder::api_requests_per_minute)
    /// - [`assistant`](RateCardBuilder::assistant)
    /// - [`days_per_month`](RateCardBuilder::days_per_month)
    /// - [`display_vat_rate`](RateCardBuilder::display_vat_rate)
    /// - [`meters`](RateCardBuilder::meters)
    /// - [`prices`](RateCardBuilder::prices)
    /// - [`storage`](RateCardBuilder::storage)
    /// - [`unverified_ceiling`](RateCardBuilder::unverified_ceiling)
    /// - [`x`](RateCardBuilder::x)
    pub fn build(self) -> Result<RateCard, BuildError> {
        Ok(RateCard {
            api_requests_per_minute: self
                .api_requests_per_minute
                .ok_or_else(|| BuildError::missing_field("api_requests_per_minute"))?,
            assistant: self
                .assistant
                .ok_or_else(|| BuildError::missing_field("assistant"))?,
            days_per_month: self
                .days_per_month
                .ok_or_else(|| BuildError::missing_field("days_per_month"))?,
            display_vat_rate: self
                .display_vat_rate
                .ok_or_else(|| BuildError::missing_field("display_vat_rate"))?,
            meters: self
                .meters
                .ok_or_else(|| BuildError::missing_field("meters"))?,
            prices: self
                .prices
                .ok_or_else(|| BuildError::missing_field("prices"))?,
            storage: self
                .storage
                .ok_or_else(|| BuildError::missing_field("storage"))?,
            unverified_ceiling: self
                .unverified_ceiling
                .ok_or_else(|| BuildError::missing_field("unverified_ceiling"))?,
            x: self.x.ok_or_else(|| BuildError::missing_field("x"))?,
        })
    }
}
