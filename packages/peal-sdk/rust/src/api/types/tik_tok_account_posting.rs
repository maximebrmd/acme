pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum TikTokAccountPosting {
    #[serde(rename = "ready")]
    #[non_exhaustive]
    Ready {
        #[serde(default)]
        creator: TikTokCreator,
    },

    #[serde(rename = "blocked")]
    #[non_exhaustive]
    Blocked { reason: TikTokBlock },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl TikTokAccountPosting {
    pub fn ready(creator: TikTokCreator) -> Self {
        Self::Ready { creator }
    }

    pub fn blocked(reason: TikTokBlock) -> Self {
        Self::Blocked { reason }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
