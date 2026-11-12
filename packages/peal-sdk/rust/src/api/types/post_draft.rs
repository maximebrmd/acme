pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostDraft {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(rename = "channelSets")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_sets: Option<Vec<String>>,
    #[serde(default)]
    pub content: PostContent,
    #[serde(rename = "defaultSignatures")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_signatures: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<ChannelOptions>>,
    #[serde(rename = "shortenLinks")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shorten_links: Option<bool>,
    #[serde(rename = "signatureId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature_id: Option<String>,
    #[serde(rename = "tagIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_ids: Option<Vec<String>>,
}

impl PostDraft {
    pub fn builder() -> PostDraftBuilder {
        <PostDraftBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostDraftBuilder {
    channel_ids: Option<Vec<String>>,
    channel_sets: Option<Vec<String>>,
    content: Option<PostContent>,
    default_signatures: Option<bool>,
    options: Option<Vec<ChannelOptions>>,
    shorten_links: Option<bool>,
    signature_id: Option<String>,
    tag_ids: Option<Vec<String>>,
}

impl PostDraftBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn channel_sets(mut self, value: Vec<String>) -> Self {
        self.channel_sets = Some(value);
        self
    }

    pub fn content(mut self, value: PostContent) -> Self {
        self.content = Some(value);
        self
    }

    pub fn default_signatures(mut self, value: bool) -> Self {
        self.default_signatures = Some(value);
        self
    }

    pub fn options(mut self, value: Vec<ChannelOptions>) -> Self {
        self.options = Some(value);
        self
    }

    pub fn shorten_links(mut self, value: bool) -> Self {
        self.shorten_links = Some(value);
        self
    }

    pub fn signature_id(mut self, value: impl Into<String>) -> Self {
        self.signature_id = Some(value.into());
        self
    }

    pub fn tag_ids(mut self, value: Vec<String>) -> Self {
        self.tag_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostDraft`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](PostDraftBuilder::channel_ids)
    /// - [`content`](PostDraftBuilder::content)
    pub fn build(self) -> Result<PostDraft, BuildError> {
        Ok(PostDraft {
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            channel_sets: self.channel_sets,
            content: self
                .content
                .ok_or_else(|| BuildError::missing_field("content"))?,
            default_signatures: self.default_signatures,
            options: self.options,
            shorten_links: self.shorten_links,
            signature_id: self.signature_id,
            tag_ids: self.tag_ids,
        })
    }
}
