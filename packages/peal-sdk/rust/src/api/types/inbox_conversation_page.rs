pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxConversationPage {
    #[serde(default)]
    pub items: Vec<InboxConversation>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl InboxConversationPage {
    pub fn builder() -> InboxConversationPageBuilder {
        <InboxConversationPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxConversationPageBuilder {
    items: Option<Vec<InboxConversation>>,
    next_cursor: Option<String>,
}

impl InboxConversationPageBuilder {
    pub fn items(mut self, value: Vec<InboxConversation>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxConversationPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](InboxConversationPageBuilder::items)
    pub fn build(self) -> Result<InboxConversationPage, BuildError> {
        Ok(InboxConversationPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
