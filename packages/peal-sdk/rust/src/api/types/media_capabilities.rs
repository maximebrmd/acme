pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct MediaCapabilities {
    #[serde(rename = "altText")]
    #[serde(default)]
    pub alt_text: MediaCapabilitiesAltText,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub formats: Option<Vec<MediaFormat>>,
    #[serde(rename = "maxCount")]
    #[serde(default)]
    pub max_count: i64,
    #[serde(rename = "maxVideos")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_videos: Option<i64>,
    #[serde(rename = "mixesKinds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mixes_kinds: Option<bool>,
    #[serde(default)]
    pub required: bool,
}

impl MediaCapabilities {
    pub fn builder() -> MediaCapabilitiesBuilder {
        <MediaCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaCapabilitiesBuilder {
    alt_text: Option<MediaCapabilitiesAltText>,
    formats: Option<Vec<MediaFormat>>,
    max_count: Option<i64>,
    max_videos: Option<i64>,
    mixes_kinds: Option<bool>,
    required: Option<bool>,
}

impl MediaCapabilitiesBuilder {
    pub fn alt_text(mut self, value: MediaCapabilitiesAltText) -> Self {
        self.alt_text = Some(value);
        self
    }

    pub fn formats(mut self, value: Vec<MediaFormat>) -> Self {
        self.formats = Some(value);
        self
    }

    pub fn max_count(mut self, value: i64) -> Self {
        self.max_count = Some(value);
        self
    }

    pub fn max_videos(mut self, value: i64) -> Self {
        self.max_videos = Some(value);
        self
    }

    pub fn mixes_kinds(mut self, value: bool) -> Self {
        self.mixes_kinds = Some(value);
        self
    }

    pub fn required(mut self, value: bool) -> Self {
        self.required = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`alt_text`](MediaCapabilitiesBuilder::alt_text)
    /// - [`max_count`](MediaCapabilitiesBuilder::max_count)
    /// - [`required`](MediaCapabilitiesBuilder::required)
    pub fn build(self) -> Result<MediaCapabilities, BuildError> {
        Ok(MediaCapabilities {
            alt_text: self
                .alt_text
                .ok_or_else(|| BuildError::missing_field("alt_text"))?,
            formats: self.formats,
            max_count: self
                .max_count
                .ok_or_else(|| BuildError::missing_field("max_count"))?,
            max_videos: self.max_videos,
            mixes_kinds: self.mixes_kinds,
            required: self
                .required
                .ok_or_else(|| BuildError::missing_field("required"))?,
        })
    }
}
