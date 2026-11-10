pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartPreview {
    #[serde(default)]
    pub hashtags: LimitedCount,
    #[serde(default)]
    pub links: LimitedCount,
    #[serde(default)]
    pub media: LimitedCount,
    #[serde(default)]
    pub mentions: LimitedCount,
    #[serde(default)]
    pub part: i64,
    #[serde(default)]
    pub text: String,
    #[serde(rename = "textCounts")]
    #[serde(default)]
    pub text_counts: Vec<TextCount>,
}

impl PartPreview {
    pub fn builder() -> PartPreviewBuilder {
        <PartPreviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartPreviewBuilder {
    hashtags: Option<LimitedCount>,
    links: Option<LimitedCount>,
    media: Option<LimitedCount>,
    mentions: Option<LimitedCount>,
    part: Option<i64>,
    text: Option<String>,
    text_counts: Option<Vec<TextCount>>,
}

impl PartPreviewBuilder {
    pub fn hashtags(mut self, value: LimitedCount) -> Self {
        self.hashtags = Some(value);
        self
    }

    pub fn links(mut self, value: LimitedCount) -> Self {
        self.links = Some(value);
        self
    }

    pub fn media(mut self, value: LimitedCount) -> Self {
        self.media = Some(value);
        self
    }

    pub fn mentions(mut self, value: LimitedCount) -> Self {
        self.mentions = Some(value);
        self
    }

    pub fn part(mut self, value: i64) -> Self {
        self.part = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn text_counts(mut self, value: Vec<TextCount>) -> Self {
        self.text_counts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartPreview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`hashtags`](PartPreviewBuilder::hashtags)
    /// - [`links`](PartPreviewBuilder::links)
    /// - [`media`](PartPreviewBuilder::media)
    /// - [`mentions`](PartPreviewBuilder::mentions)
    /// - [`part`](PartPreviewBuilder::part)
    /// - [`text`](PartPreviewBuilder::text)
    /// - [`text_counts`](PartPreviewBuilder::text_counts)
    pub fn build(self) -> Result<PartPreview, BuildError> {
        Ok(PartPreview {
            hashtags: self
                .hashtags
                .ok_or_else(|| BuildError::missing_field("hashtags"))?,
            links: self
                .links
                .ok_or_else(|| BuildError::missing_field("links"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            mentions: self
                .mentions
                .ok_or_else(|| BuildError::missing_field("mentions"))?,
            part: self.part.ok_or_else(|| BuildError::missing_field("part"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            text_counts: self
                .text_counts
                .ok_or_else(|| BuildError::missing_field("text_counts"))?,
        })
    }
}
