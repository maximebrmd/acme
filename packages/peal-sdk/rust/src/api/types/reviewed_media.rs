pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReviewedMedia {
    #[serde(rename = "altText")]
    #[serde(default)]
    pub alt_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<MediaKind>,
    #[serde(rename = "mediaId")]
    #[serde(default)]
    pub media_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl ReviewedMedia {
    pub fn builder() -> ReviewedMediaBuilder {
        <ReviewedMediaBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewedMediaBuilder {
    alt_text: Option<String>,
    kind: Option<MediaKind>,
    media_id: Option<String>,
    url: Option<String>,
}

impl ReviewedMediaBuilder {
    pub fn alt_text(mut self, value: impl Into<String>) -> Self {
        self.alt_text = Some(value.into());
        self
    }

    pub fn kind(mut self, value: MediaKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn media_id(mut self, value: impl Into<String>) -> Self {
        self.media_id = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReviewedMedia`].
    /// This method will fail if any of the following fields are not set:
    /// - [`alt_text`](ReviewedMediaBuilder::alt_text)
    /// - [`media_id`](ReviewedMediaBuilder::media_id)
    pub fn build(self) -> Result<ReviewedMedia, BuildError> {
        Ok(ReviewedMedia {
            alt_text: self
                .alt_text
                .ok_or_else(|| BuildError::missing_field("alt_text"))?,
            kind: self.kind,
            media_id: self
                .media_id
                .ok_or_else(|| BuildError::missing_field("media_id"))?,
            url: self.url,
        })
    }
}
