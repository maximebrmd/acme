pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct BulkPosts {
    #[serde(default)]
    pub posts: Vec<BulkPost>,
}

impl BulkPosts {
    pub fn builder() -> BulkPostsBuilder {
        <BulkPostsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BulkPostsBuilder {
    posts: Option<Vec<BulkPost>>,
}

impl BulkPostsBuilder {
    pub fn posts(mut self, value: Vec<BulkPost>) -> Self {
        self.posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BulkPosts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`posts`](BulkPostsBuilder::posts)
    pub fn build(self) -> Result<BulkPosts, BuildError> {
        Ok(BulkPosts {
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
        })
    }
}
