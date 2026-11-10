pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ServiceUnavailableErrorBody {
    #[non_exhaustive]
    BillingUnavailable {
        #[serde(rename = "workspaceId")]
        #[serde(default)]
        workspace_id: String,
    },

    #[non_exhaustive]
    MediaStoreUnavailable {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ServiceUnavailableErrorBody {
    pub fn billing_unavailable(workspace_id: String) -> Self {
        Self::BillingUnavailable { workspace_id }
    }

    pub fn media_store_unavailable() -> Self {
        Self::MediaStoreUnavailable {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
