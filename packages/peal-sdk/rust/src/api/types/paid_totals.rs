pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PaidTotals {
    #[serde(default)]
    pub clicks: i64,
    #[serde(default)]
    pub impressions: i64,
    #[serde(default)]
    pub reach: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub results: Option<i64>,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub spend: i64,
}

impl PaidTotals {
    pub fn builder() -> PaidTotalsBuilder {
        <PaidTotalsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PaidTotalsBuilder {
    clicks: Option<i64>,
    impressions: Option<i64>,
    reach: Option<i64>,
    results: Option<i64>,
    spend: Option<i64>,
}

impl PaidTotalsBuilder {
    pub fn clicks(mut self, value: i64) -> Self {
        self.clicks = Some(value);
        self
    }

    pub fn impressions(mut self, value: i64) -> Self {
        self.impressions = Some(value);
        self
    }

    pub fn reach(mut self, value: i64) -> Self {
        self.reach = Some(value);
        self
    }

    pub fn results(mut self, value: i64) -> Self {
        self.results = Some(value);
        self
    }

    pub fn spend(mut self, value: i64) -> Self {
        self.spend = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PaidTotals`].
    /// This method will fail if any of the following fields are not set:
    /// - [`clicks`](PaidTotalsBuilder::clicks)
    /// - [`impressions`](PaidTotalsBuilder::impressions)
    /// - [`reach`](PaidTotalsBuilder::reach)
    /// - [`spend`](PaidTotalsBuilder::spend)
    pub fn build(self) -> Result<PaidTotals, BuildError> {
        Ok(PaidTotals {
            clicks: self
                .clicks
                .ok_or_else(|| BuildError::missing_field("clicks"))?,
            impressions: self
                .impressions
                .ok_or_else(|| BuildError::missing_field("impressions"))?,
            reach: self
                .reach
                .ok_or_else(|| BuildError::missing_field("reach"))?,
            results: self.results,
            spend: self
                .spend
                .ok_or_else(|| BuildError::missing_field("spend"))?,
        })
    }
}
