pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Article {
    #[serde(rename = "authorId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<String>,
    pub body: ArticleBody,
    #[serde(default)]
    pub categories: Vec<String>,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(rename = "coverMediaId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_media_id: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub excerpt: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "siteStatus")]
    pub site_status: ArticleSiteStatus,
    pub state: ArticleState,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub title: String,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
}

impl Article {
    pub fn builder() -> ArticleBuilder {
        <ArticleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleBuilder {
    author_id: Option<String>,
    body: Option<ArticleBody>,
    categories: Option<Vec<String>>,
    channel_id: Option<String>,
    cover_media_id: Option<String>,
    created_at: Option<String>,
    excerpt: Option<String>,
    id: Option<String>,
    site_status: Option<ArticleSiteStatus>,
    state: Option<ArticleState>,
    tags: Option<Vec<String>>,
    title: Option<String>,
    updated_at: Option<String>,
}

impl ArticleBuilder {
    pub fn author_id(mut self, value: impl Into<String>) -> Self {
        self.author_id = Some(value.into());
        self
    }

    pub fn body(mut self, value: ArticleBody) -> Self {
        self.body = Some(value);
        self
    }

    pub fn categories(mut self, value: Vec<String>) -> Self {
        self.categories = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn cover_media_id(mut self, value: impl Into<String>) -> Self {
        self.cover_media_id = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn excerpt(mut self, value: impl Into<String>) -> Self {
        self.excerpt = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn site_status(mut self, value: ArticleSiteStatus) -> Self {
        self.site_status = Some(value);
        self
    }

    pub fn state(mut self, value: ArticleState) -> Self {
        self.state = Some(value);
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

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Article`].
    /// This method will fail if any of the following fields are not set:
    /// - [`body`](ArticleBuilder::body)
    /// - [`categories`](ArticleBuilder::categories)
    /// - [`channel_id`](ArticleBuilder::channel_id)
    /// - [`created_at`](ArticleBuilder::created_at)
    /// - [`id`](ArticleBuilder::id)
    /// - [`site_status`](ArticleBuilder::site_status)
    /// - [`state`](ArticleBuilder::state)
    /// - [`tags`](ArticleBuilder::tags)
    /// - [`title`](ArticleBuilder::title)
    /// - [`updated_at`](ArticleBuilder::updated_at)
    pub fn build(self) -> Result<Article, BuildError> {
        Ok(Article {
            author_id: self.author_id,
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
            categories: self
                .categories
                .ok_or_else(|| BuildError::missing_field("categories"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            cover_media_id: self.cover_media_id,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            excerpt: self.excerpt,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            site_status: self
                .site_status
                .ok_or_else(|| BuildError::missing_field("site_status"))?,
            state: self
                .state
                .ok_or_else(|| BuildError::missing_field("state"))?,
            tags: self.tags.ok_or_else(|| BuildError::missing_field("tags"))?,
            title: self
                .title
                .ok_or_else(|| BuildError::missing_field("title"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
        })
    }
}
