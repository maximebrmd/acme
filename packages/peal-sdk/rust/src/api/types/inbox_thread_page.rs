pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxThreadPage {
    #[serde(default)]
    pub items: Vec<InboxThread>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl InboxThreadPage {
    pub fn builder() -> InboxThreadPageBuilder {
        <InboxThreadPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxThreadPageBuilder {
    items: Option<Vec<InboxThread>>,
    next_cursor: Option<String>,
}

impl InboxThreadPageBuilder {
    pub fn items(mut self, value: Vec<InboxThread>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxThreadPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](InboxThreadPageBuilder::items)
    pub fn build(self) -> Result<InboxThreadPage, BuildError> {
        Ok(InboxThreadPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
