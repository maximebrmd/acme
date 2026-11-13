pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PricesAccounts {
    #[serde(default)]
    pub bands: Vec<AccountBand>,
}

impl PricesAccounts {
    pub fn builder() -> PricesAccountsBuilder {
        <PricesAccountsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PricesAccountsBuilder {
    bands: Option<Vec<AccountBand>>,
}

impl PricesAccountsBuilder {
    pub fn bands(mut self, value: Vec<AccountBand>) -> Self {
        self.bands = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PricesAccounts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`bands`](PricesAccountsBuilder::bands)
    pub fn build(self) -> Result<PricesAccounts, BuildError> {
        Ok(PricesAccounts {
            bands: self
                .bands
                .ok_or_else(|| BuildError::missing_field("bands"))?,
        })
    }
}
