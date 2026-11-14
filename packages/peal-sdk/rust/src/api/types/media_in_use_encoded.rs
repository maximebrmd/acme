pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaInUseEncoded {
    #[serde(rename = "_tag")]
    pub tag: MediaInUseEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "postIds")]
    #[serde(default)]
    pub post_ids: Vec<String>,
    #[serde(rename = "articleIds")]
    #[serde(default)]
    pub article_ids: Vec<String>,
}

impl MediaInUseEncoded {
    pub fn builder() -> MediaInUseEncodedBuilder {
        <MediaInUseEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaInUseEncodedBuilder {
    tag: Option<MediaInUseEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    post_ids: Option<Vec<String>>,
    article_ids: Option<Vec<String>>,
}

impl MediaInUseEncodedBuilder {
    pub fn tag(mut self, value: MediaInUseEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn post_ids(mut self, value: Vec<String>) -> Self {
        self.post_ids = Some(value);
        self
    }

    pub fn article_ids(mut self, value: Vec<String>) -> Self {
        self.article_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaInUseEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](MediaInUseEncodedBuilder::tag)
    /// - [`post_ids`](MediaInUseEncodedBuilder::post_ids)
    /// - [`article_ids`](MediaInUseEncodedBuilder::article_ids)
    pub fn build(self) -> Result<MediaInUseEncoded, BuildError> {
        Ok(MediaInUseEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            post_ids: self
                .post_ids
                .ok_or_else(|| BuildError::missing_field("post_ids"))?,
            article_ids: self
                .article_ids
                .ok_or_else(|| BuildError::missing_field("article_ids"))?,
        })
    }
}
