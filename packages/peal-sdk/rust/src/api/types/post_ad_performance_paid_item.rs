pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PostAdPerformancePaidItem {
    pub account: AdAccount,
    #[serde(default)]
    pub ads: i64,
    #[serde(default)]
    pub totals: PaidTotals,
}

impl PostAdPerformancePaidItem {
    pub fn builder() -> PostAdPerformancePaidItemBuilder {
        <PostAdPerformancePaidItemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostAdPerformancePaidItemBuilder {
    account: Option<AdAccount>,
    ads: Option<i64>,
    totals: Option<PaidTotals>,
}

impl PostAdPerformancePaidItemBuilder {
    pub fn account(mut self, value: AdAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn ads(mut self, value: i64) -> Self {
        self.ads = Some(value);
        self
    }

    pub fn totals(mut self, value: PaidTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostAdPerformancePaidItem`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account`](PostAdPerformancePaidItemBuilder::account)
    /// - [`ads`](PostAdPerformancePaidItemBuilder::ads)
    /// - [`totals`](PostAdPerformancePaidItemBuilder::totals)
    pub fn build(self) -> Result<PostAdPerformancePaidItem, BuildError> {
        Ok(PostAdPerformancePaidItem {
            account: self
                .account
                .ok_or_else(|| BuildError::missing_field("account"))?,
            ads: self.ads.ok_or_else(|| BuildError::missing_field("ads"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
