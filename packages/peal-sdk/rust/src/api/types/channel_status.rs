pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ChannelStatus {
    #[serde(rename = "active")]
    #[non_exhaustive]
    Active {},

    #[serde(rename = "refreshNeeded")]
    #[non_exhaustive]
    RefreshNeeded {},

    #[serde(rename = "disabled")]
    #[non_exhaustive]
    Disabled {
        #[serde(rename = "refreshNeeded")]
        #[serde(default)]
        refresh_needed: bool,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ChannelStatus {
    pub fn active() -> Self {
        Self::Active {}
    }

    pub fn refresh_needed() -> Self {
        Self::RefreshNeeded {}
    }

    pub fn disabled(refresh_needed: bool) -> Self {
        Self::Disabled { refresh_needed }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
