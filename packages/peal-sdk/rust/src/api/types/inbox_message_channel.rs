pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxMessageChannel {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(rename = "enabledAt")]
    #[serde(default)]
    pub enabled_at: String,
    #[serde(rename = "enabledBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled_by: Option<String>,
}

impl InboxMessageChannel {
    pub fn builder() -> InboxMessageChannelBuilder {
        <InboxMessageChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxMessageChannelBuilder {
    channel_id: Option<String>,
    enabled_at: Option<String>,
    enabled_by: Option<String>,
}

impl InboxMessageChannelBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn enabled_at(mut self, value: impl Into<String>) -> Self {
        self.enabled_at = Some(value.into());
        self
    }

    pub fn enabled_by(mut self, value: impl Into<String>) -> Self {
        self.enabled_by = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxMessageChannel`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](InboxMessageChannelBuilder::channel_id)
    /// - [`enabled_at`](InboxMessageChannelBuilder::enabled_at)
    pub fn build(self) -> Result<InboxMessageChannel, BuildError> {
        Ok(InboxMessageChannel {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            enabled_at: self
                .enabled_at
                .ok_or_else(|| BuildError::missing_field("enabled_at"))?,
            enabled_by: self.enabled_by,
        })
    }
}
