pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelAccountTakenEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
}

impl ChannelAccountTakenEncoded {
    pub fn builder() -> ChannelAccountTakenEncodedBuilder {
        <ChannelAccountTakenEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelAccountTakenEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    channel_id: Option<String>,
}

impl ChannelAccountTakenEncodedBuilder {
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

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChannelAccountTakenEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ChannelAccountTakenEncodedBuilder::channel_id)
    pub fn build(self) -> Result<ChannelAccountTakenEncoded, BuildError> {
        Ok(ChannelAccountTakenEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
        })
    }
}
