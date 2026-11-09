pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Media {
    #[serde(rename = "altText")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_text: Option<String>,
    #[serde(rename = "byteSize")]
    #[serde(default)]
    pub byte_size: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codec: Option<String>,
    #[serde(rename = "contentType")]
    pub content_type: MediaContentType,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dimensions: Option<MediaDimensions>,
    #[serde(rename = "durationMs")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    #[serde(default)]
    pub id: String,
    pub kind: MediaKind,
    pub status: MediaStatus,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl Media {
    pub fn builder() -> MediaBuilder {
        <MediaBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaBuilder {
    alt_text: Option<String>,
    byte_size: Option<i64>,
    codec: Option<String>,
    content_type: Option<MediaContentType>,
    created_at: Option<String>,
    dimensions: Option<MediaDimensions>,
    duration_ms: Option<i64>,
    id: Option<String>,
    kind: Option<MediaKind>,
    status: Option<MediaStatus>,
    updated_at: Option<String>,
    url: Option<String>,
}

impl MediaBuilder {
    pub fn alt_text(mut self, value: impl Into<String>) -> Self {
        self.alt_text = Some(value.into());
        self
    }

    pub fn byte_size(mut self, value: i64) -> Self {
        self.byte_size = Some(value);
        self
    }

    pub fn codec(mut self, value: impl Into<String>) -> Self {
        self.codec = Some(value.into());
        self
    }

    pub fn content_type(mut self, value: MediaContentType) -> Self {
        self.content_type = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn dimensions(mut self, value: MediaDimensions) -> Self {
        self.dimensions = Some(value);
        self
    }

    pub fn duration_ms(mut self, value: i64) -> Self {
        self.duration_ms = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn kind(mut self, value: MediaKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn status(mut self, value: MediaStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Media`].
    /// This method will fail if any of the following fields are not set:
    /// - [`byte_size`](MediaBuilder::byte_size)
    /// - [`content_type`](MediaBuilder::content_type)
    /// - [`created_at`](MediaBuilder::created_at)
    /// - [`id`](MediaBuilder::id)
    /// - [`kind`](MediaBuilder::kind)
    /// - [`status`](MediaBuilder::status)
    /// - [`updated_at`](MediaBuilder::updated_at)
    pub fn build(self) -> Result<Media, BuildError> {
        Ok(Media {
            alt_text: self.alt_text,
            byte_size: self
                .byte_size
                .ok_or_else(|| BuildError::missing_field("byte_size"))?,
            codec: self.codec,
            content_type: self
                .content_type
                .ok_or_else(|| BuildError::missing_field("content_type"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            dimensions: self.dimensions,
            duration_ms: self.duration_ms,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
            url: self.url,
        })
    }
}
