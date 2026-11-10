pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChannelPreview {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub hashtags: LimitedCount,
    #[serde(default)]
    pub links: LimitedCount,
    #[serde(default)]
    pub media: LimitedCount,
    #[serde(default)]
    pub mentions: LimitedCount,
    pub platform: Platform,
    #[serde(default)]
    pub text: String,
    #[serde(rename = "textCounts")]
    #[serde(default)]
    pub text_counts: Vec<TextCount>,
    #[serde(default)]
    pub violations: Vec<ContentViolation>,
}

impl ChannelPreview {
    pub fn builder() -> ChannelPreviewBuilder {
        <ChannelPreviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelPreviewBuilder {
    channel_id: Option<String>,
    hashtags: Option<LimitedCount>,
    links: Option<LimitedCount>,
    media: Option<LimitedCount>,
    mentions: Option<LimitedCount>,
    platform: Option<Platform>,
    text: Option<String>,
    text_counts: Option<Vec<TextCount>>,
    violations: Option<Vec<ContentViolation>>,
}

impl ChannelPreviewBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn hashtags(mut self, value: LimitedCount) -> Self {
        self.hashtags = Some(value);
        self
    }

    pub fn links(mut self, value: LimitedCount) -> Self {
        self.links = Some(value);
        self
    }

    pub fn media(mut self, value: LimitedCount) -> Self {
        self.media = Some(value);
        self
    }

    pub fn mentions(mut self, value: LimitedCount) -> Self {
        self.mentions = Some(value);
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

    pub fn text_counts(mut self, value: Vec<TextCount>) -> Self {
        self.text_counts = Some(value);
        self
    }

    pub fn violations(mut self, value: Vec<ContentViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelPreview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ChannelPreviewBuilder::channel_id)
    /// - [`hashtags`](ChannelPreviewBuilder::hashtags)
    /// - [`links`](ChannelPreviewBuilder::links)
    /// - [`media`](ChannelPreviewBuilder::media)
    /// - [`mentions`](ChannelPreviewBuilder::mentions)
    /// - [`platform`](ChannelPreviewBuilder::platform)
    /// - [`text`](ChannelPreviewBuilder::text)
    /// - [`text_counts`](ChannelPreviewBuilder::text_counts)
    /// - [`violations`](ChannelPreviewBuilder::violations)
    pub fn build(self) -> Result<ChannelPreview, BuildError> {
        Ok(ChannelPreview {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            hashtags: self
                .hashtags
                .ok_or_else(|| BuildError::missing_field("hashtags"))?,
            links: self
                .links
                .ok_or_else(|| BuildError::missing_field("links"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            mentions: self
                .mentions
                .ok_or_else(|| BuildError::missing_field("mentions"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            text_counts: self
                .text_counts
                .ok_or_else(|| BuildError::missing_field("text_counts"))?,
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
        })
    }
}
