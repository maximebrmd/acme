pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaAttachment {
    #[serde(rename = "altText")]
    #[serde(default)]
    pub alt_text: String,
    #[serde(rename = "mediaId")]
    #[serde(default)]
    pub media_id: String,
}

impl MediaAttachment {
    pub fn builder() -> MediaAttachmentBuilder {
        <MediaAttachmentBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaAttachmentBuilder {
    alt_text: Option<String>,
    media_id: Option<String>,
}

impl MediaAttachmentBuilder {
    pub fn alt_text(mut self, value: impl Into<String>) -> Self {
        self.alt_text = Some(value.into());
        self
    }

    pub fn media_id(mut self, value: impl Into<String>) -> Self {
        self.media_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MediaAttachment`].
    /// This method will fail if any of the following fields are not set:
    /// - [`alt_text`](MediaAttachmentBuilder::alt_text)
    /// - [`media_id`](MediaAttachmentBuilder::media_id)
    pub fn build(self) -> Result<MediaAttachment, BuildError> {
        Ok(MediaAttachment {
            alt_text: self
                .alt_text
                .ok_or_else(|| BuildError::missing_field("alt_text"))?,
            media_id: self
                .media_id
                .ok_or_else(|| BuildError::missing_field("media_id"))?,
        })
    }
}
