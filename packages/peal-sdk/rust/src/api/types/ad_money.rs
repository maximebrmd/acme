pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AdMoney {
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub amount: i64,
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    #[serde(default)]
    pub currency: String,
}

impl AdMoney {
    pub fn builder() -> AdMoneyBuilder {
        <AdMoneyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdMoneyBuilder {
    amount: Option<i64>,
    currency: Option<String>,
}

impl AdMoneyBuilder {
    pub fn amount(mut self, value: i64) -> Self {
        self.amount = Some(value);
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AdMoney`].
    /// This method will fail if any of the following fields are not set:
    /// - [`amount`](AdMoneyBuilder::amount)
    /// - [`currency`](AdMoneyBuilder::currency)
    pub fn build(self) -> Result<AdMoney, BuildError> {
        Ok(AdMoney {
            amount: self
                .amount
                .ok_or_else(|| BuildError::missing_field("amount"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
        })
    }
}
