pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PlanAllowances {
    #[serde(rename = "assistantRequests")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assistant_requests: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<i64>,
    #[serde(rename = "mediaStorage")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub media_storage: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub members: Option<i64>,
    #[serde(rename = "scheduledPosts")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_posts: Option<i64>,
}

impl PlanAllowances {
    pub fn builder() -> PlanAllowancesBuilder {
        <PlanAllowancesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlanAllowancesBuilder {
    assistant_requests: Option<i64>,
    channels: Option<i64>,
    media_storage: Option<i64>,
    members: Option<i64>,
    scheduled_posts: Option<i64>,
}

impl PlanAllowancesBuilder {
    pub fn assistant_requests(mut self, value: i64) -> Self {
        self.assistant_requests = Some(value);
        self
    }

    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
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

    pub fn scheduled_posts(mut self, value: i64) -> Self {
        self.scheduled_posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlanAllowances`].
    pub fn build(self) -> Result<PlanAllowances, BuildError> {
        Ok(PlanAllowances {
            assistant_requests: self.assistant_requests,
            channels: self.channels,
            media_storage: self.media_storage,
            members: self.members,
            scheduled_posts: self.scheduled_posts,
        })
    }
}
