pub use crate::prelude::*;

/// Query parameters for listCommentRules
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListCommentRulesQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<CommentRuleStatus>,
}

impl ListCommentRulesQueryRequest {
    pub fn builder() -> ListCommentRulesQueryRequestBuilder {
        <ListCommentRulesQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListCommentRulesQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
    status: Option<CommentRuleStatus>,
}

impl ListCommentRulesQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn status(mut self, value: CommentRuleStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ListCommentRulesQueryRequest`].
    pub fn build(self) -> Result<ListCommentRulesQueryRequest, BuildError> {
        Ok(ListCommentRulesQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
            status: self.status,
        })
    }
}
