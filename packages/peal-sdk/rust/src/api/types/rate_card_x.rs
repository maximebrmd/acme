pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardX {
    #[serde(rename = "defaultCeiling")]
    #[serde(default)]
    pub default_ceiling: i64,
    #[serde(default)]
    pub rates: RateCardXRates,
    #[serde(rename = "ratesReadOn")]
    #[serde(default)]
    pub rates_read_on: String,
}

impl RateCardX {
    pub fn builder() -> RateCardXBuilder {
        <RateCardXBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardXBuilder {
    default_ceiling: Option<i64>,
    rates: Option<RateCardXRates>,
    rates_read_on: Option<String>,
}

impl RateCardXBuilder {
    pub fn default_ceiling(mut self, value: i64) -> Self {
        self.default_ceiling = Some(value);
        self
    }

    pub fn rates(mut self, value: RateCardXRates) -> Self {
        self.rates = Some(value);
        self
    }

    pub fn rates_read_on(mut self, value: impl Into<String>) -> Self {
        self.rates_read_on = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`RateCardX`].
    /// This method will fail if any of the following fields are not set:
    /// - [`default_ceiling`](RateCardXBuilder::default_ceiling)
    /// - [`rates`](RateCardXBuilder::rates)
    /// - [`rates_read_on`](RateCardXBuilder::rates_read_on)
    pub fn build(self) -> Result<RateCardX, BuildError> {
        Ok(RateCardX {
            default_ceiling: self
                .default_ceiling
                .ok_or_else(|| BuildError::missing_field("default_ceiling"))?,
            rates: self
                .rates
                .ok_or_else(|| BuildError::missing_field("rates"))?,
            rates_read_on: self
                .rates_read_on
                .ok_or_else(|| BuildError::missing_field("rates_read_on"))?,
        })
    }
}
