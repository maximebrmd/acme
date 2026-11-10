pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnknownChannelsEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
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
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    channel_ids: Option<Vec<String>>,
}

impl UnknownChannelsEncodedBuilder {
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

    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnknownChannelsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](UnknownChannelsEncodedBuilder::channel_ids)
    pub fn build(self) -> Result<UnknownChannelsEncoded, BuildError> {
        Ok(UnknownChannelsEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
        })
    }
}
