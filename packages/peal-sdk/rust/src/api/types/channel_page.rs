pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ChannelPage {
    #[serde(default)]
    pub counts: ChannelPageCounts,
    #[serde(default)]
    pub items: Vec<Channel>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl ChannelPage {
    pub fn builder() -> ChannelPageBuilder {
        <ChannelPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelPageBuilder {
    counts: Option<ChannelPageCounts>,
    items: Option<Vec<Channel>>,
    next_cursor: Option<String>,
}

impl ChannelPageBuilder {
    pub fn counts(mut self, value: ChannelPageCounts) -> Self {
        self.counts = Some(value);
        self
    }

    pub fn items(mut self, value: Vec<Channel>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChannelPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`counts`](ChannelPageBuilder::counts)
    /// - [`items`](ChannelPageBuilder::items)
    pub fn build(self) -> Result<ChannelPage, BuildError> {
        Ok(ChannelPage {
            counts: self
                .counts
                .ok_or_else(|| BuildError::missing_field("counts"))?,
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
