pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ArticlePage {
    #[serde(default)]
    pub items: Vec<Article>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl ArticlePage {
    pub fn builder() -> ArticlePageBuilder {
        <ArticlePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticlePageBuilder {
    items: Option<Vec<Article>>,
    next_cursor: Option<String>,
}

impl ArticlePageBuilder {
    pub fn items(mut self, value: Vec<Article>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ArticlePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](ArticlePageBuilder::items)
    pub fn build(self) -> Result<ArticlePage, BuildError> {
        Ok(ArticlePage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
