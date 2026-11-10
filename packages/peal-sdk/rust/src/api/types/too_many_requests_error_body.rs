pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum TooManyRequestsErrorBody {
    #[non_exhaustive]
    TooManyWebhookSends {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        allowed: i64,
    },

    #[non_exhaustive]
    TooManyRequests {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        limit: i64,
        #[serde(rename = "retryAfterSeconds")]
        #[serde(default)]
        retry_after_seconds: i64,
        #[serde(rename = "windowSeconds")]
        #[serde(default)]
        window_seconds: i64,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl TooManyRequestsErrorBody {
    pub fn too_many_webhook_sends(allowed: i64) -> Self {
        Self::TooManyWebhookSends {
            code: None,
            message: None,
            request_id: None,
            allowed,
        }
    }

    pub fn too_many_requests(limit: i64, retry_after_seconds: i64, window_seconds: i64) -> Self {
        Self::TooManyRequests {
            code: None,
            message: None,
            request_id: None,
            limit,
            retry_after_seconds,
            window_seconds,
        }
    }

    pub fn too_many_webhook_sends_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyWebhookSends {
            code: Some(code),
            message,
            request_id,
            allowed,
        }
    }

    pub fn too_many_webhook_sends_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyWebhookSends {
            code,
            message: Some(message),
            request_id,
            allowed,
        }
    }

    pub fn too_many_webhook_sends_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        allowed: i64,
    ) -> Self {
        Self::TooManyWebhookSends {
            code,
            message,
            request_id: Some(request_id),
            allowed,
        }
    }

    pub fn too_many_requests_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        limit: i64,
        retry_after_seconds: i64,
        window_seconds: i64,
    ) -> Self {
        Self::TooManyRequests {
            code: Some(code),
            message,
            request_id,
            limit,
            retry_after_seconds,
            window_seconds,
        }
    }

    pub fn too_many_requests_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        limit: i64,
        retry_after_seconds: i64,
        window_seconds: i64,
    ) -> Self {
        Self::TooManyRequests {
            code,
            message: Some(message),
            request_id,
            limit,
            retry_after_seconds,
            window_seconds,
        }
    }

    pub fn too_many_requests_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        limit: i64,
        retry_after_seconds: i64,
        window_seconds: i64,
    ) -> Self {
        Self::TooManyRequests {
            code,
            message,
            request_id: Some(request_id),
            limit,
            retry_after_seconds,
            window_seconds,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
