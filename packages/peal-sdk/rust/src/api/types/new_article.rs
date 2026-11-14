pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NewArticle {
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
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule: Option<ArticleTime>,
}

impl NewArticle {
    pub fn builder() -> NewArticleBuilder {
        <NewArticleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewArticleBuilder {
    body: Option<ArticleBody>,
    categories: Option<Vec<String>>,
    cover_media_id: Option<String>,
    excerpt: Option<String>,
    site_status: Option<ArticleSiteStatus>,
    tags: Option<Vec<String>>,
    title: Option<String>,
    channel_id: Option<String>,
    schedule: Option<ArticleTime>,
}

impl NewArticleBuilder {
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

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn schedule(mut self, value: ArticleTime) -> Self {
        self.schedule = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewArticle`].
    /// This method will fail if any of the following fields are not set:
    /// - [`body`](NewArticleBuilder::body)
    /// - [`title`](NewArticleBuilder::title)
    /// - [`channel_id`](NewArticleBuilder::channel_id)
    pub fn build(self) -> Result<NewArticle, BuildError> {
        Ok(NewArticle {
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
            categories: self.categories,
            cover_media_id: self.cover_media_id,
            excerpt: self.excerpt,
            site_status: self.site_status,
            tags: self.tags,
            title: self
                .title
                .ok_or_else(|| BuildError::missing_field("title"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            schedule: self.schedule,
        })
    }
}
