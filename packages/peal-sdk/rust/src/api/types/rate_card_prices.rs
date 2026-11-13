pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardPrices {
    #[serde(default)]
    pub usd: Prices,
}

impl RateCardPrices {
    pub fn builder() -> RateCardPricesBuilder {
        <RateCardPricesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardPricesBuilder {
    usd: Option<Prices>,
}

impl RateCardPricesBuilder {
    pub fn usd(mut self, value: Prices) -> Self {
        self.usd = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCardPrices`].
    /// This method will fail if any of the following fields are not set:
    /// - [`usd`](RateCardPricesBuilder::usd)
    pub fn build(self) -> Result<RateCardPrices, BuildError> {
        Ok(RateCardPrices {
            usd: self.usd.ok_or_else(|| BuildError::missing_field("usd"))?,
        })
    }
}
