pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaInUseEncoded {
    #[serde(rename = "_tag")]
    pub tag: MediaInUseEncodedTag,
    #[serde(rename = "postIds")]
    #[serde(default)]
    pub post_ids: Vec<String>,
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
    post_ids: Option<Vec<String>>,
}

impl MediaInUseEncodedBuilder {
    pub fn tag(mut self, value: MediaInUseEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn post_ids(mut self, value: Vec<String>) -> Self {
        self.post_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaInUseEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](MediaInUseEncodedBuilder::tag)
    /// - [`post_ids`](MediaInUseEncodedBuilder::post_ids)
    pub fn build(self) -> Result<MediaInUseEncoded, BuildError> {
        Ok(MediaInUseEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            post_ids: self
                .post_ids
                .ok_or_else(|| BuildError::missing_field("post_ids"))?,
        })
    }
}
