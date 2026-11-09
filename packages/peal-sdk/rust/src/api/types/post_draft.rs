pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostDraft {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(default)]
    pub content: PostContent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<ChannelOptions>>,
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
    content: Option<PostContent>,
    options: Option<Vec<ChannelOptions>>,
}

impl PostDraftBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn content(mut self, value: PostContent) -> Self {
        self.content = Some(value);
        self
    }

    pub fn options(mut self, value: Vec<ChannelOptions>) -> Self {
        self.options = Some(value);
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
            content: self
                .content
                .ok_or_else(|| BuildError::missing_field("content"))?,
            options: self.options,
        })
    }
}
