pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FollowUpRule {
    pub approval: FollowUpApprovalState,
    #[serde(rename = "approvedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_at: Option<String>,
    #[serde(rename = "approvedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_by: Option<String>,
    #[serde(default)]
    pub channels: Vec<ChannelFollowUps>,
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "endedReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_reason: Option<FollowUpEndReason>,
    #[serde(rename = "followUps")]
    #[serde(default)]
    pub follow_ups: Vec<FollowUp>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub likes: i64,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(default)]
    pub repost: bool,
    #[serde(rename = "startedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_by: Option<String>,
    #[serde(rename = "startedVia")]
    pub started_via: PostOrigin,
    pub status: FollowUpRuleStatus,
}

impl FollowUpRule {
    pub fn builder() -> FollowUpRuleBuilder {
        <FollowUpRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpRuleBuilder {
    approval: Option<FollowUpApprovalState>,
    approved_at: Option<String>,
    approved_by: Option<String>,
    channels: Option<Vec<ChannelFollowUps>>,
    channel_id: Option<String>,
    comment: Option<String>,
    created_at: Option<String>,
    ended_reason: Option<FollowUpEndReason>,
    follow_ups: Option<Vec<FollowUp>>,
    id: Option<String>,
    likes: Option<i64>,
    post_id: Option<String>,
    repost: Option<bool>,
    started_by: Option<String>,
    started_via: Option<PostOrigin>,
    status: Option<FollowUpRuleStatus>,
}

impl FollowUpRuleBuilder {
    pub fn approval(mut self, value: FollowUpApprovalState) -> Self {
        self.approval = Some(value);
        self
    }

    pub fn approved_at(mut self, value: impl Into<String>) -> Self {
        self.approved_at = Some(value.into());
        self
    }

    pub fn approved_by(mut self, value: impl Into<String>) -> Self {
        self.approved_by = Some(value.into());
        self
    }

    pub fn channels(mut self, value: Vec<ChannelFollowUps>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn comment(mut self, value: impl Into<String>) -> Self {
        self.comment = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn ended_reason(mut self, value: FollowUpEndReason) -> Self {
        self.ended_reason = Some(value);
        self
    }

    pub fn follow_ups(mut self, value: Vec<FollowUp>) -> Self {
        self.follow_ups = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn repost(mut self, value: bool) -> Self {
        self.repost = Some(value);
        self
    }

    pub fn started_by(mut self, value: impl Into<String>) -> Self {
        self.started_by = Some(value.into());
        self
    }

    pub fn started_via(mut self, value: PostOrigin) -> Self {
        self.started_via = Some(value);
        self
    }

    pub fn status(mut self, value: FollowUpRuleStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FollowUpRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approval`](FollowUpRuleBuilder::approval)
    /// - [`channels`](FollowUpRuleBuilder::channels)
    /// - [`created_at`](FollowUpRuleBuilder::created_at)
    /// - [`follow_ups`](FollowUpRuleBuilder::follow_ups)
    /// - [`id`](FollowUpRuleBuilder::id)
    /// - [`likes`](FollowUpRuleBuilder::likes)
    /// - [`repost`](FollowUpRuleBuilder::repost)
    /// - [`started_via`](FollowUpRuleBuilder::started_via)
    /// - [`status`](FollowUpRuleBuilder::status)
    pub fn build(self) -> Result<FollowUpRule, BuildError> {
        Ok(FollowUpRule {
            approval: self
                .approval
                .ok_or_else(|| BuildError::missing_field("approval"))?,
            approved_at: self.approved_at,
            approved_by: self.approved_by,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            channel_id: self.channel_id,
            comment: self.comment,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            ended_reason: self.ended_reason,
            follow_ups: self
                .follow_ups
                .ok_or_else(|| BuildError::missing_field("follow_ups"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            post_id: self.post_id,
            repost: self
                .repost
                .ok_or_else(|| BuildError::missing_field("repost"))?,
            started_by: self.started_by,
            started_via: self
                .started_via
                .ok_or_else(|| BuildError::missing_field("started_via"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
