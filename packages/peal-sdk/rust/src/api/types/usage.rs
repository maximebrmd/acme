pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Usage {
    #[serde(rename = "assistantRequests")]
    #[serde(default)]
    pub assistant_requests: PeriodUsage,
    #[serde(default)]
    pub channels: i64,
    #[serde(default)]
    pub members: i64,
    #[serde(rename = "scheduledPosts")]
    #[serde(default)]
    pub scheduled_posts: PeriodUsage,
}

impl Usage {
    pub fn builder() -> UsageBuilder {
        <UsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UsageBuilder {
    assistant_requests: Option<PeriodUsage>,
    channels: Option<i64>,
    members: Option<i64>,
    scheduled_posts: Option<PeriodUsage>,
}

impl UsageBuilder {
    pub fn assistant_requests(mut self, value: PeriodUsage) -> Self {
        self.assistant_requests = Some(value);
        self
    }

    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn members(mut self, value: i64) -> Self {
        self.members = Some(value);
        self
    }

    pub fn scheduled_posts(mut self, value: PeriodUsage) -> Self {
        self.scheduled_posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Usage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`assistant_requests`](UsageBuilder::assistant_requests)
    /// - [`channels`](UsageBuilder::channels)
    /// - [`members`](UsageBuilder::members)
    /// - [`scheduled_posts`](UsageBuilder::scheduled_posts)
    pub fn build(self) -> Result<Usage, BuildError> {
        Ok(Usage {
            assistant_requests: self
                .assistant_requests
                .ok_or_else(|| BuildError::missing_field("assistant_requests"))?,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            members: self
                .members
                .ok_or_else(|| BuildError::missing_field("members"))?,
            scheduled_posts: self
                .scheduled_posts
                .ok_or_else(|| BuildError::missing_field("scheduled_posts"))?,
        })
    }
}
