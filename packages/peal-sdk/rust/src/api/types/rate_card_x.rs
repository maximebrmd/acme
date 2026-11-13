pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardX {
    #[serde(rename = "defaultCeiling")]
    #[serde(default)]
    pub default_ceiling: i64,
    #[serde(default)]
    pub rates: RateCardXRates,
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

    /// Consumes the builder and constructs a [`RateCardX`].
    /// This method will fail if any of the following fields are not set:
    /// - [`default_ceiling`](RateCardXBuilder::default_ceiling)
    /// - [`rates`](RateCardXBuilder::rates)
    pub fn build(self) -> Result<RateCardX, BuildError> {
        Ok(RateCardX {
            default_ceiling: self
                .default_ceiling
                .ok_or_else(|| BuildError::missing_field("default_ceiling"))?,
            rates: self
                .rates
                .ok_or_else(|| BuildError::missing_field("rates"))?,
        })
    }
}
