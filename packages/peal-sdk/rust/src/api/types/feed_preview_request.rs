pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FeedPreviewRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    #[serde(default)]
    pub url: String,
}

impl FeedPreviewRequest {
    pub fn builder() -> FeedPreviewRequestBuilder {
        <FeedPreviewRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedPreviewRequestBuilder {
    template: Option<String>,
    url: Option<String>,
}

impl FeedPreviewRequestBuilder {
    pub fn template(mut self, value: impl Into<String>) -> Self {
        self.template = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FeedPreviewRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`url`](FeedPreviewRequestBuilder::url)
    pub fn build(self) -> Result<FeedPreviewRequest, BuildError> {
        Ok(FeedPreviewRequest {
            template: self.template,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
