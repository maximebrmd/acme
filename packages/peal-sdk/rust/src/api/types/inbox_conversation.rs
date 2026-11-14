pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxConversation {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "lastIncomingAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_incoming_at: Option<String>,
    #[serde(rename = "lastMessageAt")]
    #[serde(default)]
    pub last_message_at: String,
    #[serde(default)]
    pub messages: i64,
    #[serde(default)]
    pub participants: Vec<InboxParticipant>,
    #[serde(rename = "readAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub read_at: Option<String>,
    #[serde(default)]
    pub request: bool,
    #[serde(default)]
    pub unread: bool,
}

impl InboxConversation {
    pub fn builder() -> InboxConversationBuilder {
        <InboxConversationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxConversationBuilder {
    channel_id: Option<String>,
    id: Option<String>,
    last_incoming_at: Option<String>,
    last_message_at: Option<String>,
    messages: Option<i64>,
    participants: Option<Vec<InboxParticipant>>,
    read_at: Option<String>,
    request: Option<bool>,
    unread: Option<bool>,
}

impl InboxConversationBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn last_incoming_at(mut self, value: impl Into<String>) -> Self {
        self.last_incoming_at = Some(value.into());
        self
    }

    pub fn last_message_at(mut self, value: impl Into<String>) -> Self {
        self.last_message_at = Some(value.into());
        self
    }

    pub fn messages(mut self, value: i64) -> Self {
        self.messages = Some(value);
        self
    }

    pub fn participants(mut self, value: Vec<InboxParticipant>) -> Self {
        self.participants = Some(value);
        self
    }

    pub fn read_at(mut self, value: impl Into<String>) -> Self {
        self.read_at = Some(value.into());
        self
    }

    pub fn request(mut self, value: bool) -> Self {
        self.request = Some(value);
        self
    }

    pub fn unread(mut self, value: bool) -> Self {
        self.unread = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxConversation`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](InboxConversationBuilder::channel_id)
    /// - [`id`](InboxConversationBuilder::id)
    /// - [`last_message_at`](InboxConversationBuilder::last_message_at)
    /// - [`messages`](InboxConversationBuilder::messages)
    /// - [`participants`](InboxConversationBuilder::participants)
    /// - [`request`](InboxConversationBuilder::request)
    /// - [`unread`](InboxConversationBuilder::unread)
    pub fn build(self) -> Result<InboxConversation, BuildError> {
        Ok(InboxConversation {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            last_incoming_at: self.last_incoming_at,
            last_message_at: self
                .last_message_at
                .ok_or_else(|| BuildError::missing_field("last_message_at"))?,
            messages: self
                .messages
                .ok_or_else(|| BuildError::missing_field("messages"))?,
            participants: self
                .participants
                .ok_or_else(|| BuildError::missing_field("participants"))?,
            read_at: self.read_at,
            request: self
                .request
                .ok_or_else(|| BuildError::missing_field("request"))?,
            unread: self
                .unread
                .ok_or_else(|| BuildError::missing_field("unread"))?,
        })
    }
}
