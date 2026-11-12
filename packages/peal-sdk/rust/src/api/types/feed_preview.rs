pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FeedPreview {
    #[serde(default)]
    pub items: Vec<FeedPreviewItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

impl FeedPreview {
    pub fn builder() -> FeedPreviewBuilder {
        <FeedPreviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedPreviewBuilder {
    items: Option<Vec<FeedPreviewItem>>,
    title: Option<String>,
}

impl FeedPreviewBuilder {
    pub fn items(mut self, value: Vec<FeedPreviewItem>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FeedPreview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](FeedPreviewBuilder::items)
    pub fn build(self) -> Result<FeedPreview, BuildError> {
        Ok(FeedPreview {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            title: self.title,
        })
    }
}
