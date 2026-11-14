pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxOwnerReply {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moderation: Option<InboxOwnerReplyModeration>,
    #[serde(default)]
    pub text: String,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
}

impl InboxOwnerReply {
    pub fn builder() -> InboxOwnerReplyBuilder {
        <InboxOwnerReplyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxOwnerReplyBuilder {
    moderation: Option<InboxOwnerReplyModeration>,
    text: Option<String>,
    updated_at: Option<String>,
}

impl InboxOwnerReplyBuilder {
    pub fn moderation(mut self, value: InboxOwnerReplyModeration) -> Self {
        self.moderation = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxOwnerReply`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](InboxOwnerReplyBuilder::text)
    /// - [`updated_at`](InboxOwnerReplyBuilder::updated_at)
    pub fn build(self) -> Result<InboxOwnerReply, BuildError> {
        Ok(InboxOwnerReply {
            moderation: self.moderation,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
        })
    }
}
