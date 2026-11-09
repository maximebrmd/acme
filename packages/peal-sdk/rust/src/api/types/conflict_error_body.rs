pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    AlreadyMember {},

    #[non_exhaustive]
    TooManyInvitations {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ConflictErrorBody {
    pub fn already_member() -> Self {
        Self::AlreadyMember {}
    }

    pub fn too_many_invitations() -> Self {
        Self::TooManyInvitations {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
