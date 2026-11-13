pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AccountBand {
    #[serde(default)]
    pub monthly: i64,
    #[serde(rename = "upTo")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub up_to: Option<i64>,
}

impl AccountBand {
    pub fn builder() -> AccountBandBuilder {
        <AccountBandBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AccountBandBuilder {
    monthly: Option<i64>,
    up_to: Option<i64>,
}

impl AccountBandBuilder {
    pub fn monthly(mut self, value: i64) -> Self {
        self.monthly = Some(value);
        self
    }

    pub fn up_to(mut self, value: i64) -> Self {
        self.up_to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AccountBand`].
    /// This method will fail if any of the following fields are not set:
    /// - [`monthly`](AccountBandBuilder::monthly)
    pub fn build(self) -> Result<AccountBand, BuildError> {
        Ok(AccountBand {
            monthly: self
                .monthly
                .ok_or_else(|| BuildError::missing_field("monthly"))?,
            up_to: self.up_to,
        })
    }
}
