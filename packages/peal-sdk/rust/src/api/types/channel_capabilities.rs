pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChannelCapabilities {
    pub account: AccountStanding,
    pub capabilities: PlatformCapabilities,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
}

impl ChannelCapabilities {
    pub fn builder() -> ChannelCapabilitiesBuilder {
        <ChannelCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelCapabilitiesBuilder {
    account: Option<AccountStanding>,
    capabilities: Option<PlatformCapabilities>,
    channel_id: Option<String>,
}

impl ChannelCapabilitiesBuilder {
    pub fn account(mut self, value: AccountStanding) -> Self {
        self.account = Some(value);
        self
    }

    pub fn capabilities(mut self, value: PlatformCapabilities) -> Self {
        self.capabilities = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChannelCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account`](ChannelCapabilitiesBuilder::account)
    /// - [`capabilities`](ChannelCapabilitiesBuilder::capabilities)
    /// - [`channel_id`](ChannelCapabilitiesBuilder::channel_id)
    pub fn build(self) -> Result<ChannelCapabilities, BuildError> {
        Ok(ChannelCapabilities {
            account: self
                .account
                .ok_or_else(|| BuildError::missing_field("account"))?,
            capabilities: self
                .capabilities
                .ok_or_else(|| BuildError::missing_field("capabilities"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
        })
    }
}
