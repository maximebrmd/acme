pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChannelOptions {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    pub options: TargetOptions,
}

impl ChannelOptions {
    pub fn builder() -> ChannelOptionsBuilder {
        <ChannelOptionsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelOptionsBuilder {
    channel_id: Option<String>,
    options: Option<TargetOptions>,
}

impl ChannelOptionsBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn options(mut self, value: TargetOptions) -> Self {
        self.options = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelOptions`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ChannelOptionsBuilder::channel_id)
    /// - [`options`](ChannelOptionsBuilder::options)
    pub fn build(self) -> Result<ChannelOptions, BuildError> {
        Ok(ChannelOptions {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            options: self
                .options
                .ok_or_else(|| BuildError::missing_field("options"))?,
        })
    }
}
