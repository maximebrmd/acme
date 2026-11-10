pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReplyPendingEncoded {
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
    reply_id: Option<String>,
}

impl ReplyPendingEncodedBuilder {
    pub fn reply_id(mut self, value: impl Into<String>) -> Self {
        self.reply_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReplyPendingEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`reply_id`](ReplyPendingEncodedBuilder::reply_id)
    pub fn build(self) -> Result<ReplyPendingEncoded, BuildError> {
        Ok(ReplyPendingEncoded {
            reply_id: self
                .reply_id
                .ok_or_else(|| BuildError::missing_field("reply_id"))?,
        })
    }
}
