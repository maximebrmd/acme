pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ConfirmMessageInboxMessagesRequest {
    #[serde(default)]
    pub sent: bool,
}

impl ConfirmMessageInboxMessagesRequest {
    pub fn builder() -> ConfirmMessageInboxMessagesRequestBuilder {
        <ConfirmMessageInboxMessagesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConfirmMessageInboxMessagesRequestBuilder {
    sent: Option<bool>,
}

impl ConfirmMessageInboxMessagesRequestBuilder {
    pub fn sent(mut self, value: bool) -> Self {
        self.sent = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ConfirmMessageInboxMessagesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`sent`](ConfirmMessageInboxMessagesRequestBuilder::sent)
    pub fn build(self) -> Result<ConfirmMessageInboxMessagesRequest, BuildError> {
        Ok(ConfirmMessageInboxMessagesRequest {
            sent: self.sent.ok_or_else(|| BuildError::missing_field("sent"))?,
        })
    }
}
