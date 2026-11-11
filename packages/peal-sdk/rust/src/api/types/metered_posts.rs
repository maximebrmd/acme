pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MeteredPosts {
    #[serde(default)]
    pub month: CalendarDay,
    pub platform: Platform,
    #[serde(default)]
    pub posts: i64,
    #[serde(rename = "postsWithLinks")]
    #[serde(default)]
    pub posts_with_links: i64,
}

impl MeteredPosts {
    pub fn builder() -> MeteredPostsBuilder {
        <MeteredPostsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MeteredPostsBuilder {
    month: Option<CalendarDay>,
    platform: Option<Platform>,
    posts: Option<i64>,
    posts_with_links: Option<i64>,
}

impl MeteredPostsBuilder {
    pub fn month(mut self, value: CalendarDay) -> Self {
        self.month = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
        self
    }

    pub fn posts_with_links(mut self, value: i64) -> Self {
        self.posts_with_links = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MeteredPosts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`month`](MeteredPostsBuilder::month)
    /// - [`platform`](MeteredPostsBuilder::platform)
    /// - [`posts`](MeteredPostsBuilder::posts)
    /// - [`posts_with_links`](MeteredPostsBuilder::posts_with_links)
    pub fn build(self) -> Result<MeteredPosts, BuildError> {
        Ok(MeteredPosts {
            month: self
                .month
                .ok_or_else(|| BuildError::missing_field("month"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
            posts_with_links: self
                .posts_with_links
                .ok_or_else(|| BuildError::missing_field("posts_with_links"))?,
        })
    }
}
