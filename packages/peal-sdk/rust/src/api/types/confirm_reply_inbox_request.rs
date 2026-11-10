pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ConfirmReplyInboxRequest {
    #[serde(default)]
    pub sent: bool,
}

impl ConfirmReplyInboxRequest {
    pub fn builder() -> ConfirmReplyInboxRequestBuilder {
        <ConfirmReplyInboxRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConfirmReplyInboxRequestBuilder {
    sent: Option<bool>,
}

impl ConfirmReplyInboxRequestBuilder {
    pub fn sent(mut self, value: bool) -> Self {
        self.sent = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ConfirmReplyInboxRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`sent`](ConfirmReplyInboxRequestBuilder::sent)
    pub fn build(self) -> Result<ConfirmReplyInboxRequest, BuildError> {
        Ok(ConfirmReplyInboxRequest {
            sent: self.sent.ok_or_else(|| BuildError::missing_field("sent"))?,
        })
    }
}
