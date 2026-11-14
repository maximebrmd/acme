pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SetConversationReadInboxMessagesRequest {
    #[serde(default)]
    pub read: bool,
}

impl SetConversationReadInboxMessagesRequest {
    pub fn builder() -> SetConversationReadInboxMessagesRequestBuilder {
        <SetConversationReadInboxMessagesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SetConversationReadInboxMessagesRequestBuilder {
    read: Option<bool>,
}

impl SetConversationReadInboxMessagesRequestBuilder {
    pub fn read(mut self, value: bool) -> Self {
        self.read = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SetConversationReadInboxMessagesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`read`](SetConversationReadInboxMessagesRequestBuilder::read)
    pub fn build(self) -> Result<SetConversationReadInboxMessagesRequest, BuildError> {
        Ok(SetConversationReadInboxMessagesRequest {
            read: self.read.ok_or_else(|| BuildError::missing_field("read"))?,
        })
    }
}
