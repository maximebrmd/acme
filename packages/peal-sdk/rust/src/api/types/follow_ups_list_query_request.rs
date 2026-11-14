pub use crate::prelude::*;

/// Query parameters for list
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FollowUpsListQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<FollowUpRuleStatus>,
}

impl FollowUpsListQueryRequest {
    pub fn builder() -> FollowUpsListQueryRequestBuilder {
        <FollowUpsListQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpsListQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
    post_id: Option<String>,
    status: Option<FollowUpRuleStatus>,
}

impl FollowUpsListQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn status(mut self, value: FollowUpRuleStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FollowUpsListQueryRequest`].
    pub fn build(self) -> Result<FollowUpsListQueryRequest, BuildError> {
        Ok(FollowUpsListQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
            post_id: self.post_id,
            status: self.status,
        })
    }
}
