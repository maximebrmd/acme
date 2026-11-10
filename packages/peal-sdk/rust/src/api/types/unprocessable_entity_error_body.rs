pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    ConnectFailed { reason: ConnectFailureReason },

    #[non_exhaustive]
    ReturnUrlNotAllowed {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn connect_failed(reason: ConnectFailureReason) -> Self {
        Self::ConnectFailed { reason }
    }

    pub fn return_url_not_allowed() -> Self {
        Self::ReturnUrlNotAllowed {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
