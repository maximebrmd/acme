pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlatformCapabilities {
    #[serde(default)]
    pub analytics: PlatformCapabilitiesAnalytics,
    #[serde(rename = "followUps")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow_ups: Option<FollowUpCapabilities>,
    #[serde(rename = "livePost")]
    #[serde(default)]
    pub live_post: LivePostCapabilities,
    #[serde(default)]
    pub lookups: Vec<LookupDescription>,
    #[serde(default)]
    pub media: MediaCapabilities,
    #[serde(default)]
    pub options: PlatformCapabilitiesOptions,
    pub platform: Platform,
    #[serde(default)]
    pub text: TextCapabilities,
    #[serde(default)]
    pub version: i64,
}

impl PlatformCapabilities {
    pub fn builder() -> PlatformCapabilitiesBuilder {
        <PlatformCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformCapabilitiesBuilder {
    analytics: Option<PlatformCapabilitiesAnalytics>,
    follow_ups: Option<FollowUpCapabilities>,
    live_post: Option<LivePostCapabilities>,
    lookups: Option<Vec<LookupDescription>>,
    media: Option<MediaCapabilities>,
    options: Option<PlatformCapabilitiesOptions>,
    platform: Option<Platform>,
    text: Option<TextCapabilities>,
    version: Option<i64>,
}

impl PlatformCapabilitiesBuilder {
    pub fn analytics(mut self, value: PlatformCapabilitiesAnalytics) -> Self {
        self.analytics = Some(value);
        self
    }

    pub fn follow_ups(mut self, value: FollowUpCapabilities) -> Self {
        self.follow_ups = Some(value);
        self
    }

    pub fn live_post(mut self, value: LivePostCapabilities) -> Self {
        self.live_post = Some(value);
        self
    }

    pub fn lookups(mut self, value: Vec<LookupDescription>) -> Self {
        self.lookups = Some(value);
        self
    }

    pub fn media(mut self, value: MediaCapabilities) -> Self {
        self.media = Some(value);
        self
    }

    pub fn options(mut self, value: PlatformCapabilitiesOptions) -> Self {
        self.options = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn text(mut self, value: TextCapabilities) -> Self {
        self.text = Some(value);
        self
    }

    pub fn version(mut self, value: i64) -> Self {
        self.version = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`analytics`](PlatformCapabilitiesBuilder::analytics)
    /// - [`live_post`](PlatformCapabilitiesBuilder::live_post)
    /// - [`lookups`](PlatformCapabilitiesBuilder::lookups)
    /// - [`media`](PlatformCapabilitiesBuilder::media)
    /// - [`options`](PlatformCapabilitiesBuilder::options)
    /// - [`platform`](PlatformCapabilitiesBuilder::platform)
    /// - [`text`](PlatformCapabilitiesBuilder::text)
    /// - [`version`](PlatformCapabilitiesBuilder::version)
    pub fn build(self) -> Result<PlatformCapabilities, BuildError> {
        Ok(PlatformCapabilities {
            analytics: self
                .analytics
                .ok_or_else(|| BuildError::missing_field("analytics"))?,
            follow_ups: self.follow_ups,
            live_post: self
                .live_post
                .ok_or_else(|| BuildError::missing_field("live_post"))?,
            lookups: self
                .lookups
                .ok_or_else(|| BuildError::missing_field("lookups"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            options: self
                .options
                .ok_or_else(|| BuildError::missing_field("options"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            version: self
                .version
                .ok_or_else(|| BuildError::missing_field("version"))?,
        })
    }
}
