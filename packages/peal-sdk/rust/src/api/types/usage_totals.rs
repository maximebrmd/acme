pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UsageTotals {
    #[serde(rename = "billableAccountDays")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billable_account_days: Option<i64>,
    #[serde(rename = "byPlatform")]
    #[serde(default)]
    pub by_platform: Vec<PlatformPosts>,
    #[serde(rename = "channelDays")]
    #[serde(default)]
    pub channel_days: i64,
    #[serde(rename = "daysCounted")]
    #[serde(default)]
    pub days_counted: i64,
    #[serde(rename = "meteredPosts")]
    #[serde(default)]
    pub metered_posts: Vec<MeteredPosts>,
    #[serde(rename = "publishedPosts")]
    #[serde(default)]
    pub published_posts: i64,
}

impl UsageTotals {
    pub fn builder() -> UsageTotalsBuilder {
        <UsageTotalsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UsageTotalsBuilder {
    billable_account_days: Option<i64>,
    by_platform: Option<Vec<PlatformPosts>>,
    channel_days: Option<i64>,
    days_counted: Option<i64>,
    metered_posts: Option<Vec<MeteredPosts>>,
    published_posts: Option<i64>,
}

impl UsageTotalsBuilder {
    pub fn billable_account_days(mut self, value: i64) -> Self {
        self.billable_account_days = Some(value);
        self
    }

    pub fn by_platform(mut self, value: Vec<PlatformPosts>) -> Self {
        self.by_platform = Some(value);
        self
    }

    pub fn channel_days(mut self, value: i64) -> Self {
        self.channel_days = Some(value);
        self
    }

    pub fn days_counted(mut self, value: i64) -> Self {
        self.days_counted = Some(value);
        self
    }

    pub fn metered_posts(mut self, value: Vec<MeteredPosts>) -> Self {
        self.metered_posts = Some(value);
        self
    }

    pub fn published_posts(mut self, value: i64) -> Self {
        self.published_posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UsageTotals`].
    /// This method will fail if any of the following fields are not set:
    /// - [`by_platform`](UsageTotalsBuilder::by_platform)
    /// - [`channel_days`](UsageTotalsBuilder::channel_days)
    /// - [`days_counted`](UsageTotalsBuilder::days_counted)
    /// - [`metered_posts`](UsageTotalsBuilder::metered_posts)
    /// - [`published_posts`](UsageTotalsBuilder::published_posts)
    pub fn build(self) -> Result<UsageTotals, BuildError> {
        Ok(UsageTotals {
            billable_account_days: self.billable_account_days,
            by_platform: self
                .by_platform
                .ok_or_else(|| BuildError::missing_field("by_platform"))?,
            channel_days: self
                .channel_days
                .ok_or_else(|| BuildError::missing_field("channel_days"))?,
            days_counted: self
                .days_counted
                .ok_or_else(|| BuildError::missing_field("days_counted"))?,
            metered_posts: self
                .metered_posts
                .ok_or_else(|| BuildError::missing_field("metered_posts"))?,
            published_posts: self
                .published_posts
                .ok_or_else(|| BuildError::missing_field("published_posts"))?,
        })
    }
}
