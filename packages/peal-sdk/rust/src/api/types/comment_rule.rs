pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CommentRule {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(default)]
    pub channels: Vec<ChannelCommentRule>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "endedReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_reason: Option<CommentRuleEndReason>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub matches: Vec<CommentRuleMatch>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(default)]
    pub reply: String,
    #[serde(rename = "startedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_by: Option<String>,
    pub status: CommentRuleStatus,
}

impl CommentRule {
    pub fn builder() -> CommentRuleBuilder {
        <CommentRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentRuleBuilder {
    channel_id: Option<String>,
    channels: Option<Vec<ChannelCommentRule>>,
    created_at: Option<String>,
    ended_reason: Option<CommentRuleEndReason>,
    id: Option<String>,
    keywords: Option<Vec<String>>,
    matches: Option<Vec<CommentRuleMatch>>,
    post_id: Option<String>,
    reply: Option<String>,
    started_by: Option<String>,
    status: Option<CommentRuleStatus>,
}

impl CommentRuleBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn channels(mut self, value: Vec<ChannelCommentRule>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn ended_reason(mut self, value: CommentRuleEndReason) -> Self {
        self.ended_reason = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn keywords(mut self, value: Vec<String>) -> Self {
        self.keywords = Some(value);
        self
    }

    pub fn matches(mut self, value: Vec<CommentRuleMatch>) -> Self {
        self.matches = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn reply(mut self, value: impl Into<String>) -> Self {
        self.reply = Some(value.into());
        self
    }

    pub fn started_by(mut self, value: impl Into<String>) -> Self {
        self.started_by = Some(value.into());
        self
    }

    pub fn status(mut self, value: CommentRuleStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CommentRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](CommentRuleBuilder::channels)
    /// - [`created_at`](CommentRuleBuilder::created_at)
    /// - [`id`](CommentRuleBuilder::id)
    /// - [`keywords`](CommentRuleBuilder::keywords)
    /// - [`matches`](CommentRuleBuilder::matches)
    /// - [`reply`](CommentRuleBuilder::reply)
    /// - [`status`](CommentRuleBuilder::status)
    pub fn build(self) -> Result<CommentRule, BuildError> {
        Ok(CommentRule {
            channel_id: self.channel_id,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            ended_reason: self.ended_reason,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            keywords: self
                .keywords
                .ok_or_else(|| BuildError::missing_field("keywords"))?,
            matches: self
                .matches
                .ok_or_else(|| BuildError::missing_field("matches"))?,
            post_id: self.post_id,
            reply: self
                .reply
                .ok_or_else(|| BuildError::missing_field("reply"))?,
            started_by: self.started_by,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
