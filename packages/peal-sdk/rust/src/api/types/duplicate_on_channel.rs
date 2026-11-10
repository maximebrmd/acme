pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct DuplicateOnChannel {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
}

impl DuplicateOnChannel {
    pub fn builder() -> DuplicateOnChannelBuilder {
        <DuplicateOnChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DuplicateOnChannelBuilder {
    channel_id: Option<String>,
    post_id: Option<String>,
}

impl DuplicateOnChannelBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`DuplicateOnChannel`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](DuplicateOnChannelBuilder::channel_id)
    /// - [`post_id`](DuplicateOnChannelBuilder::post_id)
    pub fn build(self) -> Result<DuplicateOnChannel, BuildError> {
        Ok(DuplicateOnChannel {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
        })
    }
}
