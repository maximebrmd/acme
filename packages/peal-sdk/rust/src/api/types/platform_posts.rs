pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlatformPosts {
    pub platform: Platform,
    #[serde(default)]
    pub posts: i64,
}

impl PlatformPosts {
    pub fn builder() -> PlatformPostsBuilder {
        <PlatformPostsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformPostsBuilder {
    platform: Option<Platform>,
    posts: Option<i64>,
}

impl PlatformPostsBuilder {
    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformPosts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`platform`](PlatformPostsBuilder::platform)
    /// - [`posts`](PlatformPostsBuilder::posts)
    pub fn build(self) -> Result<PlatformPosts, BuildError> {
        Ok(PlatformPosts {
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
        })
    }
}
