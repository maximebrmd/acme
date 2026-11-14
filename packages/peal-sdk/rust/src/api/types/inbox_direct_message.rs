pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxDirectMessage {
    #[serde(default)]
    pub attachments: i64,
    #[serde(rename = "conversationId")]
    #[serde(default)]
    pub conversation_id: String,
    #[serde(rename = "fromAccount")]
    #[serde(default)]
    pub from_account: bool,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "senderPlatformId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sender_platform_id: Option<String>,
    #[serde(rename = "sentAt")]
    #[serde(default)]
    pub sent_at: String,
    #[serde(default)]
    pub text: String,
}

impl InboxDirectMessage {
    pub fn builder() -> InboxDirectMessageBuilder {
        <InboxDirectMessageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxDirectMessageBuilder {
    attachments: Option<i64>,
    conversation_id: Option<String>,
    from_account: Option<bool>,
    id: Option<String>,
    sender_platform_id: Option<String>,
    sent_at: Option<String>,
    text: Option<String>,
}

impl InboxDirectMessageBuilder {
    pub fn attachments(mut self, value: i64) -> Self {
        self.attachments = Some(value);
        self
    }

    pub fn conversation_id(mut self, value: impl Into<String>) -> Self {
        self.conversation_id = Some(value.into());
        self
    }

    pub fn from_account(mut self, value: bool) -> Self {
        self.from_account = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn sender_platform_id(mut self, value: impl Into<String>) -> Self {
        self.sender_platform_id = Some(value.into());
        self
    }

    pub fn sent_at(mut self, value: impl Into<String>) -> Self {
        self.sent_at = Some(value.into());
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxDirectMessage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`attachments`](InboxDirectMessageBuilder::attachments)
    /// - [`conversation_id`](InboxDirectMessageBuilder::conversation_id)
    /// - [`from_account`](InboxDirectMessageBuilder::from_account)
    /// - [`id`](InboxDirectMessageBuilder::id)
    /// - [`sent_at`](InboxDirectMessageBuilder::sent_at)
    /// - [`text`](InboxDirectMessageBuilder::text)
    pub fn build(self) -> Result<InboxDirectMessage, BuildError> {
        Ok(InboxDirectMessage {
            attachments: self
                .attachments
                .ok_or_else(|| BuildError::missing_field("attachments"))?,
            conversation_id: self
                .conversation_id
                .ok_or_else(|| BuildError::missing_field("conversation_id"))?,
            from_account: self
                .from_account
                .ok_or_else(|| BuildError::missing_field("from_account"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            sender_platform_id: self.sender_platform_id,
            sent_at: self
                .sent_at
                .ok_or_else(|| BuildError::missing_field("sent_at"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
