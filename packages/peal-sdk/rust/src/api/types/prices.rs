pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Prices {
    #[serde(default)]
    pub accounts: PricesAccounts,
    #[serde(default)]
    pub meters: PricesMeters,
}

impl Prices {
    pub fn builder() -> PricesBuilder {
        <PricesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PricesBuilder {
    accounts: Option<PricesAccounts>,
    meters: Option<PricesMeters>,
}

impl PricesBuilder {
    pub fn accounts(mut self, value: PricesAccounts) -> Self {
        self.accounts = Some(value);
        self
    }

    pub fn meters(mut self, value: PricesMeters) -> Self {
        self.meters = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Prices`].
    /// This method will fail if any of the following fields are not set:
    /// - [`accounts`](PricesBuilder::accounts)
    /// - [`meters`](PricesBuilder::meters)
    pub fn build(self) -> Result<Prices, BuildError> {
        Ok(Prices {
            accounts: self
                .accounts
                .ok_or_else(|| BuildError::missing_field("accounts"))?,
            meters: self
                .meters
                .ok_or_else(|| BuildError::missing_field("meters"))?,
        })
    }
}
