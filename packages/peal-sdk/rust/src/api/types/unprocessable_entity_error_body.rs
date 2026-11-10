pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    ConnectFailed {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: ConnectFailureReason,
    },

    #[non_exhaustive]
    ReturnUrlNotAllowed {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn connect_failed(reason: ConnectFailureReason) -> Self {
        Self::ConnectFailed {
            code: None,
            message: None,
            request_id: None,
            reason,
        }
    }

    pub fn return_url_not_allowed() -> Self {
        Self::ReturnUrlNotAllowed {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn connect_failed_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: ConnectFailureReason,
    ) -> Self {
        Self::ConnectFailed {
            code: Some(code),
            message,
            request_id,
            reason,
        }
    }

    pub fn connect_failed_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: ConnectFailureReason,
    ) -> Self {
        Self::ConnectFailed {
            code,
            message: Some(message),
            request_id,
            reason,
        }
    }

    pub fn connect_failed_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: ConnectFailureReason,
    ) -> Self {
        Self::ConnectFailed {
            code,
            message,
            request_id: Some(request_id),
            reason,
        }
    }

    pub fn return_url_not_allowed_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::ReturnUrlNotAllowed {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn return_url_not_allowed_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::ReturnUrlNotAllowed {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn return_url_not_allowed_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::ReturnUrlNotAllowed {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
