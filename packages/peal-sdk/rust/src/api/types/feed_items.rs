pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FeedItems {
    #[serde(default)]
    pub items: Vec<FeedItem>,
}

impl FeedItems {
    pub fn builder() -> FeedItemsBuilder {
        <FeedItemsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedItemsBuilder {
    items: Option<Vec<FeedItem>>,
}

impl FeedItemsBuilder {
    pub fn items(mut self, value: Vec<FeedItem>) -> Self {
        self.items = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FeedItems`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](FeedItemsBuilder::items)
    pub fn build(self) -> Result<FeedItems, BuildError> {
        Ok(FeedItems {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
        })
    }
}
