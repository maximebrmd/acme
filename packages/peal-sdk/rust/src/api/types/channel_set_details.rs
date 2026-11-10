pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ChannelSetDetails {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<ChannelOptions>>,
}

impl ChannelSetDetails {
    pub fn builder() -> ChannelSetDetailsBuilder {
        <ChannelSetDetailsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelSetDetailsBuilder {
    channel_ids: Option<Vec<String>>,
    name: Option<String>,
    options: Option<Vec<ChannelOptions>>,
}

impl ChannelSetDetailsBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn options(mut self, value: Vec<ChannelOptions>) -> Self {
        self.options = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelSetDetails`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](ChannelSetDetailsBuilder::channel_ids)
    /// - [`name`](ChannelSetDetailsBuilder::name)
    pub fn build(self) -> Result<ChannelSetDetails, BuildError> {
        Ok(ChannelSetDetails {
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            options: self.options,
        })
    }
}
