pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    PostNotReviewable {
        status: PostNotReviewableEncodedStatus,
    },

    #[non_exhaustive]
    TooManyReviewLinks {
        #[serde(default)]
        limit: i64,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ConflictErrorBody {
    pub fn post_not_reviewable(status: PostNotReviewableEncodedStatus) -> Self {
        Self::PostNotReviewable { status }
    }

    pub fn too_many_review_links(limit: i64) -> Self {
        Self::TooManyReviewLinks { limit }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
