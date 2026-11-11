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

    #[serde(rename = "queueChannelsDropped")]
    #[non_exhaustive]
    QueueChannelsDropped {
        #[serde(rename = "channelIds")]
        #[serde(default)]
        channel_ids: Vec<String>,
        #[serde(rename = "queueId")]
        #[serde(default)]
        queue_id: String,
        #[serde(rename = "queueName")]
        #[serde(default)]
        queue_name: String,
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

    pub fn queue_channels_dropped(
        channel_ids: Vec<String>,
        queue_id: String,
        queue_name: String,
    ) -> Self {
        Self::QueueChannelsDropped {
            channel_ids,
            queue_id,
            queue_name,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
