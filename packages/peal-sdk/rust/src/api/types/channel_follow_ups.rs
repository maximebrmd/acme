pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ChannelFollowUps {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    pub comment: FollowUpAbility,
    pub platform: Platform,
    pub repost: FollowUpAbility,
}

impl ChannelFollowUps {
    pub fn builder() -> ChannelFollowUpsBuilder {
        <ChannelFollowUpsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelFollowUpsBuilder {
    channel_id: Option<String>,
    comment: Option<FollowUpAbility>,
    platform: Option<Platform>,
    repost: Option<FollowUpAbility>,
}

impl ChannelFollowUpsBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn comment(mut self, value: FollowUpAbility) -> Self {
        self.comment = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn repost(mut self, value: FollowUpAbility) -> Self {
        self.repost = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelFollowUps`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ChannelFollowUpsBuilder::channel_id)
    /// - [`comment`](ChannelFollowUpsBuilder::comment)
    /// - [`platform`](ChannelFollowUpsBuilder::platform)
    /// - [`repost`](ChannelFollowUpsBuilder::repost)
    pub fn build(self) -> Result<ChannelFollowUps, BuildError> {
        Ok(ChannelFollowUps {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            comment: self
                .comment
                .ok_or_else(|| BuildError::missing_field("comment"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            repost: self
                .repost
                .ok_or_else(|| BuildError::missing_field("repost"))?,
        })
    }
}
