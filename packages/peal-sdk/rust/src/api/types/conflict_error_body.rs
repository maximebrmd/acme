pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    ExternalIdTaken {
        #[serde(rename = "workspaceId")]
        #[serde(default)]
        workspace_id: String,
    },

    #[non_exhaustive]
    IdempotencyKeyReused {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ConflictErrorBody {
    pub fn external_id_taken(workspace_id: String) -> Self {
        Self::ExternalIdTaken { workspace_id }
    }

    pub fn idempotency_key_reused() -> Self {
        Self::IdempotencyKeyReused {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
