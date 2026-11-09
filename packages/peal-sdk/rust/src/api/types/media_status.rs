pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum MediaStatus {
    #[serde(rename = "pending")]
    #[non_exhaustive]
    Pending {},

    #[serde(rename = "uploaded")]
    #[non_exhaustive]
    Uploaded { probe: ProbeState },

    #[serde(rename = "ready")]
    #[non_exhaustive]
    Ready {},

    #[serde(rename = "rejected")]
    #[non_exhaustive]
    Rejected { reason: RejectionReason },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl MediaStatus {
    pub fn pending() -> Self {
        Self::Pending {}
    }

    pub fn uploaded(probe: ProbeState) -> Self {
        Self::Uploaded { probe }
    }

    pub fn ready() -> Self {
        Self::Ready {}
    }

    pub fn rejected(reason: RejectionReason) -> Self {
        Self::Rejected { reason }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
