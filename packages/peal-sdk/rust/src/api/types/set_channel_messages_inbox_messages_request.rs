pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SetChannelMessagesInboxMessagesRequest {
    #[serde(default)]
    pub enabled: bool,
}

impl SetChannelMessagesInboxMessagesRequest {
    pub fn builder() -> SetChannelMessagesInboxMessagesRequestBuilder {
        <SetChannelMessagesInboxMessagesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SetChannelMessagesInboxMessagesRequestBuilder {
    enabled: Option<bool>,
}

impl SetChannelMessagesInboxMessagesRequestBuilder {
    pub fn enabled(mut self, value: bool) -> Self {
        self.enabled = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SetChannelMessagesInboxMessagesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`enabled`](SetChannelMessagesInboxMessagesRequestBuilder::enabled)
    pub fn build(self) -> Result<SetChannelMessagesInboxMessagesRequest, BuildError> {
        Ok(SetChannelMessagesInboxMessagesRequest {
            enabled: self
                .enabled
                .ok_or_else(|| BuildError::missing_field("enabled"))?,
        })
    }
}
