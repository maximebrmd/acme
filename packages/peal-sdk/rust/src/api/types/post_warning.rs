pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum PostWarning {
    #[serde(rename = "channelsDropped")]
    #[non_exhaustive]
    ChannelsDropped {
        #[serde(rename = "channelIds")]
        #[serde(default)]
        channel_ids: Vec<String>,
        #[serde(rename = "channelSetId")]
        #[serde(default)]
        channel_set_id: String,
        #[serde(rename = "channelSetName")]
        #[serde(default)]
        channel_set_name: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl PostWarning {
    pub fn channels_dropped(
        channel_ids: Vec<String>,
        channel_set_id: String,
        channel_set_name: String,
    ) -> Self {
        Self::ChannelsDropped {
            channel_ids,
            channel_set_id,
            channel_set_name,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
