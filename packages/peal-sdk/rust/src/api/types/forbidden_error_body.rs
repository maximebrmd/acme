pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ForbiddenErrorBody {
    #[non_exhaustive]
    Forbidden {},

    #[non_exhaustive]
    PartnerAccountsClosed {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ForbiddenErrorBody {
    pub fn forbidden() -> Self {
        Self::Forbidden {}
    }

    pub fn partner_accounts_closed() -> Self {
        Self::PartnerAccountsClosed {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
