pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnknownChannelsEncoded {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
}

impl UnknownChannelsEncoded {
    pub fn builder() -> UnknownChannelsEncodedBuilder {
        <UnknownChannelsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnknownChannelsEncodedBuilder {
    channel_ids: Option<Vec<String>>,
}

impl UnknownChannelsEncodedBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnknownChannelsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](UnknownChannelsEncodedBuilder::channel_ids)
    pub fn build(self) -> Result<UnknownChannelsEncoded, BuildError> {
        Ok(UnknownChannelsEncoded {
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
        })
    }
}
