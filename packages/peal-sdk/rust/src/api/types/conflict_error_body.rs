pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    PostNotReviewable {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        status: PostNotReviewableEncodedStatus,
    },

    #[non_exhaustive]
    TooManyReviewLinks {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
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
        Self::PostNotReviewable {
            code: None,
            message: None,
            request_id: None,
            status,
        }
    }

    pub fn too_many_review_links(limit: i64) -> Self {
        Self::TooManyReviewLinks {
            code: None,
            message: None,
            request_id: None,
            limit,
        }
    }

    pub fn post_not_reviewable_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        status: PostNotReviewableEncodedStatus,
    ) -> Self {
        Self::PostNotReviewable {
            code: Some(code),
            message,
            request_id,
            status,
        }
    }

    pub fn post_not_reviewable_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        status: PostNotReviewableEncodedStatus,
    ) -> Self {
        Self::PostNotReviewable {
            code,
            message: Some(message),
            request_id,
            status,
        }
    }

    pub fn post_not_reviewable_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        status: PostNotReviewableEncodedStatus,
    ) -> Self {
        Self::PostNotReviewable {
            code,
            message,
            request_id: Some(request_id),
            status,
        }
    }

    pub fn too_many_review_links_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        limit: i64,
    ) -> Self {
        Self::TooManyReviewLinks {
            code: Some(code),
            message,
            request_id,
            limit,
        }
    }

    pub fn too_many_review_links_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        limit: i64,
    ) -> Self {
        Self::TooManyReviewLinks {
            code,
            message: Some(message),
            request_id,
            limit,
        }
    }

    pub fn too_many_review_links_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        limit: i64,
    ) -> Self {
        Self::TooManyReviewLinks {
            code,
            message,
            request_id: Some(request_id),
            limit,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
