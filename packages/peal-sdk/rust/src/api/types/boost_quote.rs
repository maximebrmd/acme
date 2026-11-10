pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct BoostQuote {
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "capRoom")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cap_room: Option<i64>,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub ceiling: i64,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub commitment: i64,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub committed: i64,
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub days: i64,
    #[serde(rename = "endsAt")]
    #[serde(default)]
    pub ends_at: String,
    #[serde(rename = "minorUnitDigits")]
    #[serde(default)]
    #[serde(with = "crate::core::number_serializers")]
    pub minor_unit_digits: f64,
    #[serde(rename = "startsAt")]
    #[serde(default)]
    pub starts_at: String,
}

impl BoostQuote {
    pub fn builder() -> BoostQuoteBuilder {
        <BoostQuoteBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostQuoteBuilder {
    cap_room: Option<i64>,
    ceiling: Option<i64>,
    commitment: Option<i64>,
    committed: Option<i64>,
    currency: Option<String>,
    days: Option<i64>,
    ends_at: Option<String>,
    minor_unit_digits: Option<f64>,
    starts_at: Option<String>,
}

impl BoostQuoteBuilder {
    pub fn cap_room(mut self, value: i64) -> Self {
        self.cap_room = Some(value);
        self
    }

    pub fn ceiling(mut self, value: i64) -> Self {
        self.ceiling = Some(value);
        self
    }

    pub fn commitment(mut self, value: i64) -> Self {
        self.commitment = Some(value);
        self
    }

    pub fn committed(mut self, value: i64) -> Self {
        self.committed = Some(value);
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn days(mut self, value: i64) -> Self {
        self.days = Some(value);
        self
    }

    pub fn ends_at(mut self, value: impl Into<String>) -> Self {
        self.ends_at = Some(value.into());
        self
    }

    pub fn minor_unit_digits(mut self, value: f64) -> Self {
        self.minor_unit_digits = Some(value);
        self
    }

    pub fn starts_at(mut self, value: impl Into<String>) -> Self {
        self.starts_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BoostQuote`].
    /// This method will fail if any of the following fields are not set:
    /// - [`ceiling`](BoostQuoteBuilder::ceiling)
    /// - [`commitment`](BoostQuoteBuilder::commitment)
    /// - [`committed`](BoostQuoteBuilder::committed)
    /// - [`currency`](BoostQuoteBuilder::currency)
    /// - [`days`](BoostQuoteBuilder::days)
    /// - [`ends_at`](BoostQuoteBuilder::ends_at)
    /// - [`minor_unit_digits`](BoostQuoteBuilder::minor_unit_digits)
    /// - [`starts_at`](BoostQuoteBuilder::starts_at)
    pub fn build(self) -> Result<BoostQuote, BuildError> {
        Ok(BoostQuote {
            cap_room: self.cap_room,
            ceiling: self
                .ceiling
                .ok_or_else(|| BuildError::missing_field("ceiling"))?,
            commitment: self
                .commitment
                .ok_or_else(|| BuildError::missing_field("commitment"))?,
            committed: self
                .committed
                .ok_or_else(|| BuildError::missing_field("committed"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            ends_at: self
                .ends_at
                .ok_or_else(|| BuildError::missing_field("ends_at"))?,
            minor_unit_digits: self
                .minor_unit_digits
                .ok_or_else(|| BuildError::missing_field("minor_unit_digits"))?,
            starts_at: self
                .starts_at
                .ok_or_else(|| BuildError::missing_field("starts_at"))?,
        })
    }
}
