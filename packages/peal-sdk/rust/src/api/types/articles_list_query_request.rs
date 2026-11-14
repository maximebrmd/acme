pub use crate::prelude::*;

/// Query parameters for list
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ArticlesListQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<ArticleStateName>,
}

impl ArticlesListQueryRequest {
    pub fn builder() -> ArticlesListQueryRequestBuilder {
        <ArticlesListQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticlesListQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
    status: Option<ArticleStateName>,
}

impl ArticlesListQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn status(mut self, value: ArticleStateName) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ArticlesListQueryRequest`].
    pub fn build(self) -> Result<ArticlesListQueryRequest, BuildError> {
        Ok(ArticlesListQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
            status: self.status,
        })
    }
}
