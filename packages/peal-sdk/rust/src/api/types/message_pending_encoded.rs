pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MessagePendingEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "messageId")]
    #[serde(default)]
    pub message_id: String,
}

impl MessagePendingEncoded {
    pub fn builder() -> MessagePendingEncodedBuilder {
        <MessagePendingEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MessagePendingEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    message_id: Option<String>,
}

impl MessagePendingEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn message_id(mut self, value: impl Into<String>) -> Self {
        self.message_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MessagePendingEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`message_id`](MessagePendingEncodedBuilder::message_id)
    pub fn build(self) -> Result<MessagePendingEncoded, BuildError> {
        Ok(MessagePendingEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            message_id: self
                .message_id
                .ok_or_else(|| BuildError::missing_field("message_id"))?,
        })
    }
}
