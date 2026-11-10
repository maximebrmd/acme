pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PostChannel {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    pub platform: Platform,
}

impl PostChannel {
    pub fn builder() -> PostChannelBuilder {
        <PostChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostChannelBuilder {
    channel_id: Option<String>,
    platform: Option<Platform>,
}

impl PostChannelBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostChannel`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](PostChannelBuilder::channel_id)
    /// - [`platform`](PostChannelBuilder::platform)
    pub fn build(self) -> Result<PostChannel, BuildError> {
        Ok(PostChannel {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
        })
    }
}
