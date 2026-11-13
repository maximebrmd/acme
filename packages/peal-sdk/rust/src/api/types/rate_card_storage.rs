pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardStorage {
    #[serde(default)]
    pub minimum: i64,
    #[serde(rename = "perAccount")]
    #[serde(default)]
    pub per_account: i64,
    #[serde(rename = "withoutPaymentMethod")]
    #[serde(default)]
    pub without_payment_method: i64,
}

impl RateCardStorage {
    pub fn builder() -> RateCardStorageBuilder {
        <RateCardStorageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardStorageBuilder {
    minimum: Option<i64>,
    per_account: Option<i64>,
    without_payment_method: Option<i64>,
}

impl RateCardStorageBuilder {
    pub fn minimum(mut self, value: i64) -> Self {
        self.minimum = Some(value);
        self
    }

    pub fn per_account(mut self, value: i64) -> Self {
        self.per_account = Some(value);
        self
    }

    pub fn without_payment_method(mut self, value: i64) -> Self {
        self.without_payment_method = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCardStorage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`minimum`](RateCardStorageBuilder::minimum)
    /// - [`per_account`](RateCardStorageBuilder::per_account)
    /// - [`without_payment_method`](RateCardStorageBuilder::without_payment_method)
    pub fn build(self) -> Result<RateCardStorage, BuildError> {
        Ok(RateCardStorage {
            minimum: self
                .minimum
                .ok_or_else(|| BuildError::missing_field("minimum"))?,
            per_account: self
                .per_account
                .ok_or_else(|| BuildError::missing_field("per_account"))?,
            without_payment_method: self
                .without_payment_method
                .ok_or_else(|| BuildError::missing_field("without_payment_method"))?,
        })
    }
}
