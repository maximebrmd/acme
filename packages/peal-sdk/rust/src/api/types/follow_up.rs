pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FollowUp {
    #[serde(rename = "armedAt")]
    #[serde(default)]
    pub armed_at: String,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub id: String,
    pub kind: FollowUpKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub likes: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(rename = "platformPostId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform_post_id: Option<String>,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(rename = "sentAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sent_at: Option<String>,
    pub status: FollowUpStatus,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
    #[serde(rename = "triggeredAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub triggered_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<String>,
}

impl FollowUp {
    pub fn builder() -> FollowUpBuilder {
        <FollowUpBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpBuilder {
    armed_at: Option<String>,
    channel_id: Option<String>,
    id: Option<String>,
    kind: Option<FollowUpKind>,
    likes: Option<i64>,
    permalink: Option<String>,
    platform_post_id: Option<String>,
    post_id: Option<String>,
    reason: Option<String>,
    sent_at: Option<String>,
    status: Option<FollowUpStatus>,
    target_id: Option<String>,
    triggered_at: Option<String>,
    until: Option<String>,
}

impl FollowUpBuilder {
    pub fn armed_at(mut self, value: impl Into<String>) -> Self {
        self.armed_at = Some(value.into());
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn kind(mut self, value: FollowUpKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn platform_post_id(mut self, value: impl Into<String>) -> Self {
        self.platform_post_id = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn reason(mut self, value: impl Into<String>) -> Self {
        self.reason = Some(value.into());
        self
    }

    pub fn sent_at(mut self, value: impl Into<String>) -> Self {
        self.sent_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: FollowUpStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    pub fn triggered_at(mut self, value: impl Into<String>) -> Self {
        self.triggered_at = Some(value.into());
        self
    }

    pub fn until(mut self, value: impl Into<String>) -> Self {
        self.until = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FollowUp`].
    /// This method will fail if any of the following fields are not set:
    /// - [`armed_at`](FollowUpBuilder::armed_at)
    /// - [`channel_id`](FollowUpBuilder::channel_id)
    /// - [`id`](FollowUpBuilder::id)
    /// - [`kind`](FollowUpBuilder::kind)
    /// - [`post_id`](FollowUpBuilder::post_id)
    /// - [`status`](FollowUpBuilder::status)
    /// - [`target_id`](FollowUpBuilder::target_id)
    pub fn build(self) -> Result<FollowUp, BuildError> {
        Ok(FollowUp {
            armed_at: self
                .armed_at
                .ok_or_else(|| BuildError::missing_field("armed_at"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            likes: self.likes,
            permalink: self.permalink,
            platform_post_id: self.platform_post_id,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            reason: self.reason,
            sent_at: self.sent_at,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
            triggered_at: self.triggered_at,
            until: self.until,
        })
    }
}
