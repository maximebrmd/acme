pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum BadRequestErrorBody {
    #[non_exhaustive]
    InvalidDateRange {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    BadRequest {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl BadRequestErrorBody {
    pub fn invalid_date_range() -> Self {
        Self::InvalidDateRange {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn bad_request() -> Self {
        Self::BadRequest {}
    }

    pub fn invalid_date_range_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::InvalidDateRange {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn invalid_date_range_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::InvalidDateRange {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn invalid_date_range_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::InvalidDateRange {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
