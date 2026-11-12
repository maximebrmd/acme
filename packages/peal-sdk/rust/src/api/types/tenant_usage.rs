pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TenantUsage {
    #[serde(rename = "assistantRequests")]
    #[serde(default)]
    pub assistant_requests: i64,
    #[serde(rename = "byPlatform")]
    #[serde(default)]
    pub by_platform: Vec<PlatformPosts>,
    #[serde(rename = "channelDays")]
    #[serde(default)]
    pub channel_days: i64,
    #[serde(default)]
    pub channels: i64,
    #[serde(rename = "daysCounted")]
    #[serde(default)]
    pub days_counted: i64,
    #[serde(rename = "externalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(default)]
    pub home: bool,
    #[serde(rename = "mediaStorage")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub media_storage: Option<i64>,
    #[serde(rename = "meteredPosts")]
    #[serde(default)]
    pub metered_posts: Vec<MeteredPosts>,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "publishedPosts")]
    #[serde(default)]
    pub published_posts: i64,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl TenantUsage {
    pub fn builder() -> TenantUsageBuilder {
        <TenantUsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TenantUsageBuilder {
    assistant_requests: Option<i64>,
    by_platform: Option<Vec<PlatformPosts>>,
    channel_days: Option<i64>,
    channels: Option<i64>,
    days_counted: Option<i64>,
    external_id: Option<String>,
    home: Option<bool>,
    media_storage: Option<i64>,
    metered_posts: Option<Vec<MeteredPosts>>,
    name: Option<String>,
    published_posts: Option<i64>,
    workspace_id: Option<String>,
}

impl TenantUsageBuilder {
    pub fn assistant_requests(mut self, value: i64) -> Self {
        self.assistant_requests = Some(value);
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

    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn days_counted(mut self, value: i64) -> Self {
        self.days_counted = Some(value);
        self
    }

    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn home(mut self, value: bool) -> Self {
        self.home = Some(value);
        self
    }

    pub fn media_storage(mut self, value: i64) -> Self {
        self.media_storage = Some(value);
        self
    }

    pub fn metered_posts(mut self, value: Vec<MeteredPosts>) -> Self {
        self.metered_posts = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn published_posts(mut self, value: i64) -> Self {
        self.published_posts = Some(value);
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`TenantUsage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`assistant_requests`](TenantUsageBuilder::assistant_requests)
    /// - [`by_platform`](TenantUsageBuilder::by_platform)
    /// - [`channel_days`](TenantUsageBuilder::channel_days)
    /// - [`channels`](TenantUsageBuilder::channels)
    /// - [`days_counted`](TenantUsageBuilder::days_counted)
    /// - [`home`](TenantUsageBuilder::home)
    /// - [`metered_posts`](TenantUsageBuilder::metered_posts)
    /// - [`name`](TenantUsageBuilder::name)
    /// - [`published_posts`](TenantUsageBuilder::published_posts)
    /// - [`workspace_id`](TenantUsageBuilder::workspace_id)
    pub fn build(self) -> Result<TenantUsage, BuildError> {
        Ok(TenantUsage {
            assistant_requests: self
                .assistant_requests
                .ok_or_else(|| BuildError::missing_field("assistant_requests"))?,
            by_platform: self
                .by_platform
                .ok_or_else(|| BuildError::missing_field("by_platform"))?,
            channel_days: self
                .channel_days
                .ok_or_else(|| BuildError::missing_field("channel_days"))?,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            days_counted: self
                .days_counted
                .ok_or_else(|| BuildError::missing_field("days_counted"))?,
            external_id: self.external_id,
            home: self.home.ok_or_else(|| BuildError::missing_field("home"))?,
            media_storage: self.media_storage,
            metered_posts: self
                .metered_posts
                .ok_or_else(|| BuildError::missing_field("metered_posts"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            published_posts: self
                .published_posts
                .ok_or_else(|| BuildError::missing_field("published_posts"))?,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
