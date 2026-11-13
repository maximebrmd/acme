pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BillingAccountsUsage {
    #[serde(rename = "accountDays")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_days: Option<i64>,
    #[serde(default)]
    pub connected: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimate: Option<Money>,
    #[serde(rename = "nextAccount")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_account: Option<Money>,
    #[serde(default)]
    pub pooled: i64,
}

impl BillingAccountsUsage {
    pub fn builder() -> BillingAccountsUsageBuilder {
        <BillingAccountsUsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BillingAccountsUsageBuilder {
    account_days: Option<i64>,
    connected: Option<i64>,
    estimate: Option<Money>,
    next_account: Option<Money>,
    pooled: Option<i64>,
}

impl BillingAccountsUsageBuilder {
    pub fn account_days(mut self, value: i64) -> Self {
        self.account_days = Some(value);
        self
    }

    pub fn connected(mut self, value: i64) -> Self {
        self.connected = Some(value);
        self
    }

    pub fn estimate(mut self, value: Money) -> Self {
        self.estimate = Some(value);
        self
    }

    pub fn next_account(mut self, value: Money) -> Self {
        self.next_account = Some(value);
        self
    }

    pub fn pooled(mut self, value: i64) -> Self {
        self.pooled = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BillingAccountsUsage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`connected`](BillingAccountsUsageBuilder::connected)
    /// - [`pooled`](BillingAccountsUsageBuilder::pooled)
    pub fn build(self) -> Result<BillingAccountsUsage, BuildError> {
        Ok(BillingAccountsUsage {
            account_days: self.account_days,
            connected: self
                .connected
                .ok_or_else(|| BuildError::missing_field("connected"))?,
            estimate: self.estimate,
            next_account: self.next_account,
            pooled: self
                .pooled
                .ok_or_else(|| BuildError::missing_field("pooled"))?,
        })
    }
}
