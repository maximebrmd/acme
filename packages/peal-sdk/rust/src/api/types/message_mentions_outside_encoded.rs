pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MessageMentionsOutsideEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub mentions: Vec<String>,
}

impl MessageMentionsOutsideEncoded {
    pub fn builder() -> MessageMentionsOutsideEncodedBuilder {
        <MessageMentionsOutsideEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MessageMentionsOutsideEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    mentions: Option<Vec<String>>,
}

impl MessageMentionsOutsideEncodedBuilder {
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

    pub fn mentions(mut self, value: Vec<String>) -> Self {
        self.mentions = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MessageMentionsOutsideEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`mentions`](MessageMentionsOutsideEncodedBuilder::mentions)
    pub fn build(self) -> Result<MessageMentionsOutsideEncoded, BuildError> {
        Ok(MessageMentionsOutsideEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            mentions: self
                .mentions
                .ok_or_else(|| BuildError::missing_field("mentions"))?,
        })
    }
}
