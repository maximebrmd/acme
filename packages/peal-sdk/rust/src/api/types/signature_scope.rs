pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum SignatureScope {
    #[serde(rename = "workspace")]
    #[non_exhaustive]
    Workspace {},

    #[serde(rename = "platform")]
    #[non_exhaustive]
    Platform { platform: Platform },

    #[serde(rename = "channel")]
    #[non_exhaustive]
    Channel {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl SignatureScope {
    pub fn workspace() -> Self {
        Self::Workspace {}
    }

    pub fn platform(platform: Platform) -> Self {
        Self::Platform { platform }
    }

    pub fn channel(channel_id: String) -> Self {
        Self::Channel { channel_id }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
