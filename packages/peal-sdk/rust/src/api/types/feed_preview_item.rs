pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FeedPreviewItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub link: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture: Option<String>,
    #[serde(rename = "publishedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

impl FeedPreviewItem {
    pub fn builder() -> FeedPreviewItemBuilder {
        <FeedPreviewItemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedPreviewItemBuilder {
    link: Option<String>,
    picture: Option<String>,
    published_at: Option<String>,
    summary: Option<String>,
    text: Option<String>,
    title: Option<String>,
}

impl FeedPreviewItemBuilder {
    pub fn link(mut self, value: impl Into<String>) -> Self {
        self.link = Some(value.into());
        self
    }

    pub fn picture(mut self, value: impl Into<String>) -> Self {
        self.picture = Some(value.into());
        self
    }

    pub fn published_at(mut self, value: impl Into<String>) -> Self {
        self.published_at = Some(value.into());
        self
    }

    pub fn summary(mut self, value: impl Into<String>) -> Self {
        self.summary = Some(value.into());
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FeedPreviewItem`].
    pub fn build(self) -> Result<FeedPreviewItem, BuildError> {
        Ok(FeedPreviewItem {
            link: self.link,
            picture: self.picture,
            published_at: self.published_at,
            summary: self.summary,
            text: self.text,
            title: self.title,
        })
    }
}
