pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ArticleStateConflictEncoded {
    #[serde(rename = "_tag")]
    pub tag: ArticleStateConflictEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub state: ArticleStateName,
}

impl ArticleStateConflictEncoded {
    pub fn builder() -> ArticleStateConflictEncodedBuilder {
        <ArticleStateConflictEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleStateConflictEncodedBuilder {
    tag: Option<ArticleStateConflictEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    state: Option<ArticleStateName>,
}

impl ArticleStateConflictEncodedBuilder {
    pub fn tag(mut self, value: ArticleStateConflictEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn state(mut self, value: ArticleStateName) -> Self {
        self.state = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ArticleStateConflictEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ArticleStateConflictEncodedBuilder::tag)
    /// - [`state`](ArticleStateConflictEncodedBuilder::state)
    pub fn build(self) -> Result<ArticleStateConflictEncoded, BuildError> {
        Ok(ArticleStateConflictEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            state: self
                .state
                .ok_or_else(|| BuildError::missing_field("state"))?,
        })
    }
}
