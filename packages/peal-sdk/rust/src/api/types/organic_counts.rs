pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OrganicCounts {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impressions: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub likes: Option<i64>,
    #[serde(rename = "readAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub read_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replies: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reposts: Option<i64>,
}

impl OrganicCounts {
    pub fn builder() -> OrganicCountsBuilder {
        <OrganicCountsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OrganicCountsBuilder {
    channel_id: Option<String>,
    impressions: Option<i64>,
    likes: Option<i64>,
    read_at: Option<String>,
    replies: Option<i64>,
    reposts: Option<i64>,
}

impl OrganicCountsBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn impressions(mut self, value: i64) -> Self {
        self.impressions = Some(value);
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn read_at(mut self, value: impl Into<String>) -> Self {
        self.read_at = Some(value.into());
        self
    }

    pub fn replies(mut self, value: i64) -> Self {
        self.replies = Some(value);
        self
    }

    pub fn reposts(mut self, value: i64) -> Self {
        self.reposts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`OrganicCounts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](OrganicCountsBuilder::channel_id)
    pub fn build(self) -> Result<OrganicCounts, BuildError> {
        Ok(OrganicCounts {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            impressions: self.impressions,
            likes: self.likes,
            read_at: self.read_at,
            replies: self.replies,
            reposts: self.reposts,
        })
    }
}
