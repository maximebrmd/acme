pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostContent {
    #[serde(rename = "followUps")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow_ups: Option<Vec<PostPart>>,
    #[serde(default)]
    pub media: Vec<MediaAttachment>,
    #[serde(default)]
    pub overrides: Vec<TextOverride>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub poll: Option<Poll>,
    #[serde(default)]
    pub text: String,
}

impl PostContent {
    pub fn builder() -> PostContentBuilder {
        <PostContentBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostContentBuilder {
    follow_ups: Option<Vec<PostPart>>,
    media: Option<Vec<MediaAttachment>>,
    overrides: Option<Vec<TextOverride>>,
    poll: Option<Poll>,
    text: Option<String>,
}

impl PostContentBuilder {
    pub fn follow_ups(mut self, value: Vec<PostPart>) -> Self {
        self.follow_ups = Some(value);
        self
    }

    pub fn media(mut self, value: Vec<MediaAttachment>) -> Self {
        self.media = Some(value);
        self
    }

    pub fn overrides(mut self, value: Vec<TextOverride>) -> Self {
        self.overrides = Some(value);
        self
    }

    pub fn poll(mut self, value: Poll) -> Self {
        self.poll = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PostContent`].
    /// This method will fail if any of the following fields are not set:
    /// - [`media`](PostContentBuilder::media)
    /// - [`overrides`](PostContentBuilder::overrides)
    /// - [`text`](PostContentBuilder::text)
    pub fn build(self) -> Result<PostContent, BuildError> {
        Ok(PostContent {
            follow_ups: self.follow_ups,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            overrides: self
                .overrides
                .ok_or_else(|| BuildError::missing_field("overrides"))?,
            poll: self.poll,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
