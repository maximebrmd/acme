pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CreatedFeed {
    pub feed: Feed,
    #[serde(default)]
    pub seen: i64,
}

impl CreatedFeed {
    pub fn builder() -> CreatedFeedBuilder {
        <CreatedFeedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CreatedFeedBuilder {
    feed: Option<Feed>,
    seen: Option<i64>,
}

impl CreatedFeedBuilder {
    pub fn feed(mut self, value: Feed) -> Self {
        self.feed = Some(value);
        self
    }

    pub fn seen(mut self, value: i64) -> Self {
        self.seen = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CreatedFeed`].
    /// This method will fail if any of the following fields are not set:
    /// - [`feed`](CreatedFeedBuilder::feed)
    /// - [`seen`](CreatedFeedBuilder::seen)
    pub fn build(self) -> Result<CreatedFeed, BuildError> {
        Ok(CreatedFeed {
            feed: self.feed.ok_or_else(|| BuildError::missing_field("feed"))?,
            seen: self.seen.ok_or_else(|| BuildError::missing_field("seen"))?,
        })
    }
}
