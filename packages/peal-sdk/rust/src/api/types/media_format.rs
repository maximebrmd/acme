pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MediaFormat {
    #[serde(rename = "contentType")]
    pub content_type: MediaContentType,
    pub kind: MediaKind,
    #[serde(rename = "maxAspectRatio")]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    #[serde(with = "crate::core::number_serializers::option")]
    pub max_aspect_ratio: Option<f64>,
    #[serde(rename = "maxByteSize")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_byte_size: Option<i64>,
    #[serde(rename = "maxDurationMs")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_duration_ms: Option<i64>,
    #[serde(rename = "maxMediaWith")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_media_with: Option<i64>,
    #[serde(rename = "maxPixels")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_pixels: Option<i64>,
    #[serde(rename = "maxSide")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_side: Option<i64>,
    #[serde(rename = "minAspectRatio")]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    #[serde(with = "crate::core::number_serializers::option")]
    pub min_aspect_ratio: Option<f64>,
    #[serde(rename = "minByteSize")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_byte_size: Option<i64>,
    #[serde(rename = "minDurationMs")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_duration_ms: Option<i64>,
    #[serde(rename = "minSide")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_side: Option<i64>,
}

impl MediaFormat {
    pub fn builder() -> MediaFormatBuilder {
        <MediaFormatBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaFormatBuilder {
    content_type: Option<MediaContentType>,
    kind: Option<MediaKind>,
    max_aspect_ratio: Option<f64>,
    max_byte_size: Option<i64>,
    max_duration_ms: Option<i64>,
    max_media_with: Option<i64>,
    max_pixels: Option<i64>,
    max_side: Option<i64>,
    min_aspect_ratio: Option<f64>,
    min_byte_size: Option<i64>,
    min_duration_ms: Option<i64>,
    min_side: Option<i64>,
}

impl MediaFormatBuilder {
    pub fn content_type(mut self, value: MediaContentType) -> Self {
        self.content_type = Some(value);
        self
    }

    pub fn kind(mut self, value: MediaKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn max_aspect_ratio(mut self, value: f64) -> Self {
        self.max_aspect_ratio = Some(value);
        self
    }

    pub fn max_byte_size(mut self, value: i64) -> Self {
        self.max_byte_size = Some(value);
        self
    }

    pub fn max_duration_ms(mut self, value: i64) -> Self {
        self.max_duration_ms = Some(value);
        self
    }

    pub fn max_media_with(mut self, value: i64) -> Self {
        self.max_media_with = Some(value);
        self
    }

    pub fn max_pixels(mut self, value: i64) -> Self {
        self.max_pixels = Some(value);
        self
    }

    pub fn max_side(mut self, value: i64) -> Self {
        self.max_side = Some(value);
        self
    }

    pub fn min_aspect_ratio(mut self, value: f64) -> Self {
        self.min_aspect_ratio = Some(value);
        self
    }

    pub fn min_byte_size(mut self, value: i64) -> Self {
        self.min_byte_size = Some(value);
        self
    }

    pub fn min_duration_ms(mut self, value: i64) -> Self {
        self.min_duration_ms = Some(value);
        self
    }

    pub fn min_side(mut self, value: i64) -> Self {
        self.min_side = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaFormat`].
    /// This method will fail if any of the following fields are not set:
    /// - [`content_type`](MediaFormatBuilder::content_type)
    /// - [`kind`](MediaFormatBuilder::kind)
    pub fn build(self) -> Result<MediaFormat, BuildError> {
        Ok(MediaFormat {
            content_type: self
                .content_type
                .ok_or_else(|| BuildError::missing_field("content_type"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            max_aspect_ratio: self.max_aspect_ratio,
            max_byte_size: self.max_byte_size,
            max_duration_ms: self.max_duration_ms,
            max_media_with: self.max_media_with,
            max_pixels: self.max_pixels,
            max_side: self.max_side,
            min_aspect_ratio: self.min_aspect_ratio,
            min_byte_size: self.min_byte_size,
            min_duration_ms: self.min_duration_ms,
            min_side: self.min_side,
        })
    }
}
