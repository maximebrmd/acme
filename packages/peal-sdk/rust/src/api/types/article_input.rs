pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ArticleInput {
    pub body: ArticleBody,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,
    #[serde(rename = "coverMediaId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_media_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub excerpt: Option<String>,
    #[serde(rename = "siteStatus")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub site_status: Option<ArticleSiteStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub title: String,
}

impl ArticleInput {
    pub fn builder() -> ArticleInputBuilder {
        <ArticleInputBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleInputBuilder {
    body: Option<ArticleBody>,
    categories: Option<Vec<String>>,
    cover_media_id: Option<String>,
    excerpt: Option<String>,
    site_status: Option<ArticleSiteStatus>,
    tags: Option<Vec<String>>,
    title: Option<String>,
}

impl ArticleInputBuilder {
    pub fn body(mut self, value: ArticleBody) -> Self {
        self.body = Some(value);
        self
    }

    pub fn categories(mut self, value: Vec<String>) -> Self {
        self.categories = Some(value);
        self
    }

    pub fn cover_media_id(mut self, value: impl Into<String>) -> Self {
        self.cover_media_id = Some(value.into());
        self
    }

    pub fn excerpt(mut self, value: impl Into<String>) -> Self {
        self.excerpt = Some(value.into());
        self
    }

    pub fn site_status(mut self, value: ArticleSiteStatus) -> Self {
        self.site_status = Some(value);
        self
    }

    pub fn tags(mut self, value: Vec<String>) -> Self {
        self.tags = Some(value);
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ArticleInput`].
    /// This method will fail if any of the following fields are not set:
    /// - [`body`](ArticleInputBuilder::body)
    /// - [`title`](ArticleInputBuilder::title)
    pub fn build(self) -> Result<ArticleInput, BuildError> {
        Ok(ArticleInput {
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
            categories: self.categories,
            cover_media_id: self.cover_media_id,
            excerpt: self.excerpt,
            site_status: self.site_status,
            tags: self.tags,
            title: self
                .title
                .ok_or_else(|| BuildError::missing_field("title"))?,
        })
    }
}
