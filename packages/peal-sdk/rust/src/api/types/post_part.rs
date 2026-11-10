pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostPart {
    #[serde(rename = "delaySeconds")]
    #[serde(default)]
    pub delay_seconds: i64,
    #[serde(default)]
    pub media: Vec<MediaAttachment>,
    #[serde(default)]
    pub overrides: Vec<TextOverride>,
    #[serde(default)]
    pub text: String,
}

impl PostPart {
    pub fn builder() -> PostPartBuilder {
        <PostPartBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostPartBuilder {
    delay_seconds: Option<i64>,
    media: Option<Vec<MediaAttachment>>,
    overrides: Option<Vec<TextOverride>>,
    text: Option<String>,
}

impl PostPartBuilder {
    pub fn delay_seconds(mut self, value: i64) -> Self {
        self.delay_seconds = Some(value);
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

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PostPart`].
    /// This method will fail if any of the following fields are not set:
    /// - [`delay_seconds`](PostPartBuilder::delay_seconds)
    /// - [`media`](PostPartBuilder::media)
    /// - [`overrides`](PostPartBuilder::overrides)
    /// - [`text`](PostPartBuilder::text)
    pub fn build(self) -> Result<PostPart, BuildError> {
        Ok(PostPart {
            delay_seconds: self
                .delay_seconds
                .ok_or_else(|| BuildError::missing_field("delay_seconds"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            overrides: self
                .overrides
                .ok_or_else(|| BuildError::missing_field("overrides"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
