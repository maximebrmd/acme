pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PlatformCapabilitiesAnalytics {
    #[serde(rename = "accountNumbers")]
    #[serde(default)]
    pub account_numbers: Vec<PlatformCapabilitiesAnalyticsAccountNumbersItem>,
    #[serde(rename = "perPost")]
    #[serde(default)]
    pub per_post: bool,
    #[serde(rename = "postCounts")]
    #[serde(default)]
    pub post_counts: Vec<PlatformCapabilitiesAnalyticsPostCountsItem>,
}

impl PlatformCapabilitiesAnalytics {
    pub fn builder() -> PlatformCapabilitiesAnalyticsBuilder {
        <PlatformCapabilitiesAnalyticsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformCapabilitiesAnalyticsBuilder {
    account_numbers: Option<Vec<PlatformCapabilitiesAnalyticsAccountNumbersItem>>,
    per_post: Option<bool>,
    post_counts: Option<Vec<PlatformCapabilitiesAnalyticsPostCountsItem>>,
}

impl PlatformCapabilitiesAnalyticsBuilder {
    pub fn account_numbers(
        mut self,
        value: Vec<PlatformCapabilitiesAnalyticsAccountNumbersItem>,
    ) -> Self {
        self.account_numbers = Some(value);
        self
    }

    pub fn per_post(mut self, value: bool) -> Self {
        self.per_post = Some(value);
        self
    }

    pub fn post_counts(mut self, value: Vec<PlatformCapabilitiesAnalyticsPostCountsItem>) -> Self {
        self.post_counts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformCapabilitiesAnalytics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account_numbers`](PlatformCapabilitiesAnalyticsBuilder::account_numbers)
    /// - [`per_post`](PlatformCapabilitiesAnalyticsBuilder::per_post)
    /// - [`post_counts`](PlatformCapabilitiesAnalyticsBuilder::post_counts)
    pub fn build(self) -> Result<PlatformCapabilitiesAnalytics, BuildError> {
        Ok(PlatformCapabilitiesAnalytics {
            account_numbers: self
                .account_numbers
                .ok_or_else(|| BuildError::missing_field("account_numbers"))?,
            per_post: self
                .per_post
                .ok_or_else(|| BuildError::missing_field("per_post"))?,
            post_counts: self
                .post_counts
                .ok_or_else(|| BuildError::missing_field("post_counts"))?,
        })
    }
}
