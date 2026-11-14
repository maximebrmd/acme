pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxConversationDetail {
    pub abilities: InboxMessageAbilities,
    #[serde(default)]
    pub conversation: InboxConversation,
    #[serde(default)]
    pub messages: Vec<InboxDirectMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(default)]
    pub sent: Vec<InboxOutgoingMessage>,
    #[serde(default)]
    pub window: InboxReplyWindow,
}

impl InboxConversationDetail {
    pub fn builder() -> InboxConversationDetailBuilder {
        <InboxConversationDetailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxConversationDetailBuilder {
    abilities: Option<InboxMessageAbilities>,
    conversation: Option<InboxConversation>,
    messages: Option<Vec<InboxDirectMessage>>,
    platform: Option<Platform>,
    sent: Option<Vec<InboxOutgoingMessage>>,
    window: Option<InboxReplyWindow>,
}

impl InboxConversationDetailBuilder {
    pub fn abilities(mut self, value: InboxMessageAbilities) -> Self {
        self.abilities = Some(value);
        self
    }

    pub fn conversation(mut self, value: InboxConversation) -> Self {
        self.conversation = Some(value);
        self
    }

    pub fn messages(mut self, value: Vec<InboxDirectMessage>) -> Self {
        self.messages = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn sent(mut self, value: Vec<InboxOutgoingMessage>) -> Self {
        self.sent = Some(value);
        self
    }

    pub fn window(mut self, value: InboxReplyWindow) -> Self {
        self.window = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxConversationDetail`].
    /// This method will fail if any of the following fields are not set:
    /// - [`abilities`](InboxConversationDetailBuilder::abilities)
    /// - [`conversation`](InboxConversationDetailBuilder::conversation)
    /// - [`messages`](InboxConversationDetailBuilder::messages)
    /// - [`sent`](InboxConversationDetailBuilder::sent)
    /// - [`window`](InboxConversationDetailBuilder::window)
    pub fn build(self) -> Result<InboxConversationDetail, BuildError> {
        Ok(InboxConversationDetail {
            abilities: self
                .abilities
                .ok_or_else(|| BuildError::missing_field("abilities"))?,
            conversation: self
                .conversation
                .ok_or_else(|| BuildError::missing_field("conversation"))?,
            messages: self
                .messages
                .ok_or_else(|| BuildError::missing_field("messages"))?,
            platform: self.platform,
            sent: self.sent.ok_or_else(|| BuildError::missing_field("sent"))?,
            window: self
                .window
                .ok_or_else(|| BuildError::missing_field("window"))?,
        })
    }
}
