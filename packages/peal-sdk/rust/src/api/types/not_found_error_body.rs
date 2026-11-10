pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum NotFoundErrorBody {
    #[non_exhaustive]
    ReviewLinkNotFound {},

    #[non_exhaustive]
    LookupNotFound {},

    #[non_exhaustive]
    WorkspaceNotFound {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl NotFoundErrorBody {
    pub fn review_link_not_found() -> Self {
        Self::ReviewLinkNotFound {}
    }

    pub fn lookup_not_found() -> Self {
        Self::LookupNotFound {}
    }

    pub fn workspace_not_found() -> Self {
        Self::WorkspaceNotFound {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
