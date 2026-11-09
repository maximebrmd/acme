pub use crate::prelude::*;

/// Query parameters for list
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostsListQueryRequest {
    #[serde(default)]
    pub from: String,
    #[serde(default)]
    pub to: String,
}

impl PostsListQueryRequest {
    pub fn builder() -> PostsListQueryRequestBuilder {
        <PostsListQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostsListQueryRequestBuilder {
    from: Option<String>,
    to: Option<String>,
}

impl PostsListQueryRequestBuilder {
    pub fn from(mut self, value: impl Into<String>) -> Self {
        self.from = Some(value.into());
        self
    }

    pub fn to(mut self, value: impl Into<String>) -> Self {
        self.to = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PostsListQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](PostsListQueryRequestBuilder::from)
    /// - [`to`](PostsListQueryRequestBuilder::to)
    pub fn build(self) -> Result<PostsListQueryRequest, BuildError> {
        Ok(PostsListQueryRequest {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
