pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum BadRequestErrorBody {
    #[non_exhaustive]
    InvalidTimeRange {},

    #[non_exhaustive]
    BadRequest {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl BadRequestErrorBody {
    pub fn invalid_time_range() -> Self {
        Self::InvalidTimeRange {}
    }

    pub fn bad_request() -> Self {
        Self::BadRequest {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
