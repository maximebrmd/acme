pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UsageDay {
    #[serde(rename = "assistantImages")]
    #[serde(default)]
    pub assistant_images: i64,
    #[serde(rename = "assistantRequests")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assistant_requests: Option<i64>,
    #[serde(rename = "billableAccounts")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billable_accounts: Option<i64>,
    #[serde(rename = "byPlatform")]
    #[serde(default)]
    pub by_platform: Vec<PlatformPosts>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<i64>,
    #[serde(default)]
    pub day: CalendarDay,
    #[serde(rename = "mediaStorage")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub media_storage: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub members: Option<i64>,
    #[serde(rename = "outboundMessages")]
    #[serde(default)]
    pub outbound_messages: i64,
    #[serde(rename = "publishedPosts")]
    #[serde(default)]
    pub published_posts: i64,
}

impl UsageDay {
    pub fn builder() -> UsageDayBuilder {
        <UsageDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UsageDayBuilder {
    assistant_images: Option<i64>,
    assistant_requests: Option<i64>,
    billable_accounts: Option<i64>,
    by_platform: Option<Vec<PlatformPosts>>,
    channels: Option<i64>,
    day: Option<CalendarDay>,
    media_storage: Option<i64>,
    members: Option<i64>,
    outbound_messages: Option<i64>,
    published_posts: Option<i64>,
}

impl UsageDayBuilder {
    pub fn assistant_images(mut self, value: i64) -> Self {
        self.assistant_images = Some(value);
        self
    }

    pub fn assistant_requests(mut self, value: i64) -> Self {
        self.assistant_requests = Some(value);
        self
    }

    pub fn billable_accounts(mut self, value: i64) -> Self {
        self.billable_accounts = Some(value);
        self
    }

    pub fn by_platform(mut self, value: Vec<PlatformPosts>) -> Self {
        self.by_platform = Some(value);
        self
    }

    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn day(mut self, value: CalendarDay) -> Self {
        self.day = Some(value);
        self
    }

    pub fn media_storage(mut self, value: i64) -> Self {
        self.media_storage = Some(value);
        self
    }

    pub fn members(mut self, value: i64) -> Self {
        self.members = Some(value);
        self
    }

    pub fn outbound_messages(mut self, value: i64) -> Self {
        self.outbound_messages = Some(value);
        self
    }

    pub fn published_posts(mut self, value: i64) -> Self {
        self.published_posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UsageDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`assistant_images`](UsageDayBuilder::assistant_images)
    /// - [`by_platform`](UsageDayBuilder::by_platform)
    /// - [`day`](UsageDayBuilder::day)
    /// - [`outbound_messages`](UsageDayBuilder::outbound_messages)
    /// - [`published_posts`](UsageDayBuilder::published_posts)
    pub fn build(self) -> Result<UsageDay, BuildError> {
        Ok(UsageDay {
            assistant_images: self
                .assistant_images
                .ok_or_else(|| BuildError::missing_field("assistant_images"))?,
            assistant_requests: self.assistant_requests,
            billable_accounts: self.billable_accounts,
            by_platform: self
                .by_platform
                .ok_or_else(|| BuildError::missing_field("by_platform"))?,
            channels: self.channels,
            day: self.day.ok_or_else(|| BuildError::missing_field("day"))?,
            media_storage: self.media_storage,
            members: self.members,
            outbound_messages: self
                .outbound_messages
                .ok_or_else(|| BuildError::missing_field("outbound_messages"))?,
            published_posts: self
                .published_posts
                .ok_or_else(|| BuildError::missing_field("published_posts"))?,
        })
    }
}
