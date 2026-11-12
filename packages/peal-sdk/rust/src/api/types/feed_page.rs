pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FeedPage {
    #[serde(default)]
    pub items: Vec<Feed>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl FeedPage {
    pub fn builder() -> FeedPageBuilder {
        <FeedPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedPageBuilder {
    items: Option<Vec<Feed>>,
    next_cursor: Option<String>,
}

impl FeedPageBuilder {
    pub fn items(mut self, value: Vec<Feed>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FeedPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](FeedPageBuilder::items)
    pub fn build(self) -> Result<FeedPage, BuildError> {
        Ok(FeedPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
