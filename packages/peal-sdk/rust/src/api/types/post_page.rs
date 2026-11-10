pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostPage {
    #[serde(default)]
    pub channels: Vec<PostChannel>,
    #[serde(default)]
    pub items: Vec<Post>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl PostPage {
    pub fn builder() -> PostPageBuilder {
        <PostPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostPageBuilder {
    channels: Option<Vec<PostChannel>>,
    items: Option<Vec<Post>>,
    next_cursor: Option<String>,
}

impl PostPageBuilder {
    pub fn channels(mut self, value: Vec<PostChannel>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn items(mut self, value: Vec<Post>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PostPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](PostPageBuilder::channels)
    /// - [`items`](PostPageBuilder::items)
    pub fn build(self) -> Result<PostPage, BuildError> {
        Ok(PostPage {
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
