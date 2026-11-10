pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostToValidate {
    #[serde(rename = "allowDuplicate")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allow_duplicate: Option<bool>,
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(default)]
    pub content: PostContent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<ChannelOptions>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<PostTiming>,
}

impl PostToValidate {
    pub fn builder() -> PostToValidateBuilder {
        <PostToValidateBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostToValidateBuilder {
    allow_duplicate: Option<bool>,
    channel_ids: Option<Vec<String>>,
    content: Option<PostContent>,
    options: Option<Vec<ChannelOptions>>,
    when: Option<PostTiming>,
}

impl PostToValidateBuilder {
    pub fn allow_duplicate(mut self, value: bool) -> Self {
        self.allow_duplicate = Some(value);
        self
    }

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

    /// Consumes the builder and constructs a [`PostToValidate`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](PostToValidateBuilder::channel_ids)
    /// - [`content`](PostToValidateBuilder::content)
    pub fn build(self) -> Result<PostToValidate, BuildError> {
        Ok(PostToValidate {
            allow_duplicate: self.allow_duplicate,
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            content: self
                .content
                .ok_or_else(|| BuildError::missing_field("content"))?,
            options: self.options,
            when: self.when,
        })
    }
}
