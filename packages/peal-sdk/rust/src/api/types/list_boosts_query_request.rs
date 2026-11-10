pub use crate::prelude::*;

/// Query parameters for listBoosts
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListBoostsQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
}

impl ListBoostsQueryRequest {
    pub fn builder() -> ListBoostsQueryRequestBuilder {
        <ListBoostsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListBoostsQueryRequestBuilder {
    cursor: Option<String>,
    post_id: Option<String>,
}

impl ListBoostsQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ListBoostsQueryRequest`].
    pub fn build(self) -> Result<ListBoostsQueryRequest, BuildError> {
        Ok(ListBoostsQueryRequest {
            cursor: self.cursor,
            post_id: self.post_id,
        })
    }
}
