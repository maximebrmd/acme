pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxOutgoingMessage {
    #[serde(rename = "authorId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<String>,
    #[serde(rename = "conversationId")]
    #[serde(default)]
    pub conversation_id: String,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "platformMessageId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform_message_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<InboxOutgoingMessageReason>,
    #[serde(rename = "settledAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settled_at: Option<String>,
    pub status: InboxOutgoingMessageStatus,
    #[serde(default)]
    pub text: String,
}

impl InboxOutgoingMessage {
    pub fn builder() -> InboxOutgoingMessageBuilder {
        <InboxOutgoingMessageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxOutgoingMessageBuilder {
    author_id: Option<String>,
    conversation_id: Option<String>,
    created_at: Option<String>,
    id: Option<String>,
    platform_message_id: Option<String>,
    reason: Option<InboxOutgoingMessageReason>,
    settled_at: Option<String>,
    status: Option<InboxOutgoingMessageStatus>,
    text: Option<String>,
}

impl InboxOutgoingMessageBuilder {
    pub fn author_id(mut self, value: impl Into<String>) -> Self {
        self.author_id = Some(value.into());
        self
    }

    pub fn conversation_id(mut self, value: impl Into<String>) -> Self {
        self.conversation_id = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn platform_message_id(mut self, value: impl Into<String>) -> Self {
        self.platform_message_id = Some(value.into());
        self
    }

    pub fn reason(mut self, value: InboxOutgoingMessageReason) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn settled_at(mut self, value: impl Into<String>) -> Self {
        self.settled_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: InboxOutgoingMessageStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxOutgoingMessage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`conversation_id`](InboxOutgoingMessageBuilder::conversation_id)
    /// - [`created_at`](InboxOutgoingMessageBuilder::created_at)
    /// - [`id`](InboxOutgoingMessageBuilder::id)
    /// - [`status`](InboxOutgoingMessageBuilder::status)
    /// - [`text`](InboxOutgoingMessageBuilder::text)
    pub fn build(self) -> Result<InboxOutgoingMessage, BuildError> {
        Ok(InboxOutgoingMessage {
            author_id: self.author_id,
            conversation_id: self
                .conversation_id
                .ok_or_else(|| BuildError::missing_field("conversation_id"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            platform_message_id: self.platform_message_id,
            reason: self.reason,
            settled_at: self.settled_at,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
