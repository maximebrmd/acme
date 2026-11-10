pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NewPost {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(default)]
    pub content: PostContent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<ChannelOptions>>,
    pub when: PostTiming,
}

impl NewPost {
    pub fn builder() -> NewPostBuilder {
        <NewPostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewPostBuilder {
    channel_ids: Option<Vec<String>>,
    content: Option<PostContent>,
    options: Option<Vec<ChannelOptions>>,
    when: Option<PostTiming>,
}

impl NewPostBuilder {
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

    pub fn when(mut self, value: PostTiming) -> Self {
        self.when = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewPost`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](NewPostBuilder::channel_ids)
    /// - [`content`](NewPostBuilder::content)
    /// - [`when`](NewPostBuilder::when)
    pub fn build(self) -> Result<NewPost, BuildError> {
        Ok(NewPost {
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            content: self
                .content
                .ok_or_else(|| BuildError::missing_field("content"))?,
            options: self.options,
            when: self.when.ok_or_else(|| BuildError::missing_field("when"))?,
        })
    }
}
