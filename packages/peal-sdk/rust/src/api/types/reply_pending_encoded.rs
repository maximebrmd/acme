pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReplyPendingEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "replyId")]
    #[serde(default)]
    pub reply_id: String,
}

impl ReplyPendingEncoded {
    pub fn builder() -> ReplyPendingEncodedBuilder {
        <ReplyPendingEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReplyPendingEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reply_id: Option<String>,
}

impl ReplyPendingEncodedBuilder {
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

    pub fn reply_id(mut self, value: impl Into<String>) -> Self {
        self.reply_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReplyPendingEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`reply_id`](ReplyPendingEncodedBuilder::reply_id)
    pub fn build(self) -> Result<ReplyPendingEncoded, BuildError> {
        Ok(ReplyPendingEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            reply_id: self
                .reply_id
                .ok_or_else(|| BuildError::missing_field("reply_id"))?,
        })
    }
}
