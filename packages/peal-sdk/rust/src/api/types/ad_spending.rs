pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AdSpending {
    pub account: AdAccount,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "committedThisMonth")]
    #[serde(default)]
    pub committed_this_month: i64,
}

impl AdSpending {
    pub fn builder() -> AdSpendingBuilder {
        <AdSpendingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdSpendingBuilder {
    account: Option<AdAccount>,
    committed_this_month: Option<i64>,
}

impl AdSpendingBuilder {
    pub fn account(mut self, value: AdAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn committed_this_month(mut self, value: i64) -> Self {
        self.committed_this_month = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdSpending`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account`](AdSpendingBuilder::account)
    /// - [`committed_this_month`](AdSpendingBuilder::committed_this_month)
    pub fn build(self) -> Result<AdSpending, BuildError> {
        Ok(AdSpending {
            account: self
                .account
                .ok_or_else(|| BuildError::missing_field("account"))?,
            committed_this_month: self
                .committed_this_month
                .ok_or_else(|| BuildError::missing_field("committed_this_month"))?,
        })
    }
}
