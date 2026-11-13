pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ReviewedChannel {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(rename = "followUps")]
    #[serde(default)]
    pub follow_ups: Vec<ReviewedPart>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub media: Option<Vec<ReviewedMedia>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<TargetOptions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(default)]
    pub text: String,
}

impl ReviewedChannel {
    pub fn builder() -> ReviewedChannelBuilder {
        <ReviewedChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewedChannelBuilder {
    channel_id: Option<String>,
    follow_ups: Option<Vec<ReviewedPart>>,
    handle: Option<String>,
    media: Option<Vec<ReviewedMedia>>,
    options: Option<TargetOptions>,
    platform: Option<Platform>,
    text: Option<String>,
}

impl ReviewedChannelBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn follow_ups(mut self, value: Vec<ReviewedPart>) -> Self {
        self.follow_ups = Some(value);
        self
    }

    pub fn handle(mut self, value: impl Into<String>) -> Self {
        self.handle = Some(value.into());
        self
    }

    pub fn media(mut self, value: Vec<ReviewedMedia>) -> Self {
        self.media = Some(value);
        self
    }

    pub fn options(mut self, value: TargetOptions) -> Self {
        self.options = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReviewedChannel`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ReviewedChannelBuilder::channel_id)
    /// - [`follow_ups`](ReviewedChannelBuilder::follow_ups)
    /// - [`text`](ReviewedChannelBuilder::text)
    pub fn build(self) -> Result<ReviewedChannel, BuildError> {
        Ok(ReviewedChannel {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            follow_ups: self
                .follow_ups
                .ok_or_else(|| BuildError::missing_field("follow_ups"))?,
            handle: self.handle,
            media: self.media,
            options: self.options,
            platform: self.platform,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
