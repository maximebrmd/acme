pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ChannelCommentRule {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    pub platform: Platform,
    pub reply: CommentRuleAbility,
}

impl ChannelCommentRule {
    pub fn builder() -> ChannelCommentRuleBuilder {
        <ChannelCommentRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelCommentRuleBuilder {
    channel_id: Option<String>,
    platform: Option<Platform>,
    reply: Option<CommentRuleAbility>,
}

impl ChannelCommentRuleBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn reply(mut self, value: CommentRuleAbility) -> Self {
        self.reply = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelCommentRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ChannelCommentRuleBuilder::channel_id)
    /// - [`platform`](ChannelCommentRuleBuilder::platform)
    /// - [`reply`](ChannelCommentRuleBuilder::reply)
    pub fn build(self) -> Result<ChannelCommentRule, BuildError> {
        Ok(ChannelCommentRule {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            reply: self
                .reply
                .ok_or_else(|| BuildError::missing_field("reply"))?,
        })
    }
}
