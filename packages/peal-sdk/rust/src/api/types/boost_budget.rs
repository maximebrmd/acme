pub use crate::prelude::*;

/// A boost's budget in the ad account's minor units: `total` for its whole run, or `daily` for each day of it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BoostBudget {
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub amount: i64,
    pub kind: BoostBudgetKind,
}

impl BoostBudget {
    pub fn builder() -> BoostBudgetBuilder {
        <BoostBudgetBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostBudgetBuilder {
    amount: Option<i64>,
    kind: Option<BoostBudgetKind>,
}

impl BoostBudgetBuilder {
    pub fn amount(mut self, value: i64) -> Self {
        self.amount = Some(value);
        self
    }

    pub fn kind(mut self, value: BoostBudgetKind) -> Self {
        self.kind = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BoostBudget`].
    /// This method will fail if any of the following fields are not set:
    /// - [`amount`](BoostBudgetBuilder::amount)
    /// - [`kind`](BoostBudgetBuilder::kind)
    pub fn build(self) -> Result<BoostBudget, BuildError> {
        Ok(BoostBudget {
            amount: self
                .amount
                .ok_or_else(|| BuildError::missing_field("amount"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
        })
    }
}
