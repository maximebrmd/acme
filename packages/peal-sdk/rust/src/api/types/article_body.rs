pub use crate::prelude::*;

/// The rich-text editor's document: blocks of paragraphs, headings, lists, quotes, rules, code and images.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ArticleBody {
    #[serde(default)]
    pub content: Vec<serde_json::Value>,
    pub r#type: ArticleBodyType,
}

impl ArticleBody {
    pub fn builder() -> ArticleBodyBuilder {
        <ArticleBodyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleBodyBuilder {
    content: Option<Vec<serde_json::Value>>,
    r#type: Option<ArticleBodyType>,
}

impl ArticleBodyBuilder {
    pub fn content(mut self, value: Vec<serde_json::Value>) -> Self {
        self.content = Some(value);
        self
    }

    pub fn r#type(mut self, value: ArticleBodyType) -> Self {
        self.r#type = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ArticleBody`].
    /// This method will fail if any of the following fields are not set:
    /// - [`content`](ArticleBodyBuilder::content)
    /// - [`r#type`](ArticleBodyBuilder::r#type)
    pub fn build(self) -> Result<ArticleBody, BuildError> {
        Ok(ArticleBody {
            content: self
                .content
                .ok_or_else(|| BuildError::missing_field("content"))?,
            r#type: self
                .r#type
                .ok_or_else(|| BuildError::missing_field("r#type"))?,
        })
    }
}
