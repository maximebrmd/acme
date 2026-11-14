pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum TooManyRequestsErrorBody {
    #[non_exhaustive]
    FeedReadsLimited {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "retryAfterSeconds")]
        #[serde(default)]
        retry_after_seconds: i64,
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
        #[serde(skip_serializing_if = "Option::is_none")]
        policy: Option<TooManyRequestsEncodedPolicy>,
        #[serde(rename = "retryAfterSeconds")]
        #[serde(default)]
        retry_after_seconds: i64,
        #[serde(rename = "windowSeconds")]
        #[serde(default)]
        window_seconds: i64,
        #[serde(rename = "withPaymentMethod")]
        #[serde(skip_serializing_if = "Option::is_none")]
        with_payment_method: Option<i64>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl TooManyRequestsErrorBody {
    pub fn feed_reads_limited(retry_after_seconds: i64) -> Self {
        Self::FeedReadsLimited {
            code: None,
            message: None,
            request_id: None,
            retry_after_seconds,
        }
    }

    pub fn too_many_requests(limit: i64, retry_after_seconds: i64, window_seconds: i64) -> Self {
        Self::TooManyRequests {
            code: None,
            message: None,
            request_id: None,
            limit,
            policy: None,
            retry_after_seconds,
            window_seconds,
            with_payment_method: None,
        }
    }

    pub fn feed_reads_limited_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        retry_after_seconds: i64,
    ) -> Self {
        Self::FeedReadsLimited {
            code: Some(code),
            message,
            request_id,
            retry_after_seconds,
        }
    }

    pub fn feed_reads_limited_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        retry_after_seconds: i64,
    ) -> Self {
        Self::FeedReadsLimited {
            code,
            message: Some(message),
            request_id,
            retry_after_seconds,
        }
    }

    pub fn feed_reads_limited_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        retry_after_seconds: i64,
    ) -> Self {
        Self::FeedReadsLimited {
            code,
            message,
            request_id: Some(request_id),
            retry_after_seconds,
        }
    }

    pub fn too_many_requests_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        limit: i64,
        policy: Option<TooManyRequestsEncodedPolicy>,
        retry_after_seconds: i64,
        window_seconds: i64,
        with_payment_method: Option<i64>,
    ) -> Self {
        Self::TooManyRequests {
            code: Some(code),
            message,
            request_id,
            limit,
            policy,
            retry_after_seconds,
            window_seconds,
            with_payment_method,
        }
    }

    pub fn too_many_requests_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        limit: i64,
        policy: Option<TooManyRequestsEncodedPolicy>,
        retry_after_seconds: i64,
        window_seconds: i64,
        with_payment_method: Option<i64>,
    ) -> Self {
        Self::TooManyRequests {
            code,
            message: Some(message),
            request_id,
            limit,
            policy,
            retry_after_seconds,
            window_seconds,
            with_payment_method,
        }
    }

    pub fn too_many_requests_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        limit: i64,
        policy: Option<TooManyRequestsEncodedPolicy>,
        retry_after_seconds: i64,
        window_seconds: i64,
        with_payment_method: Option<i64>,
    ) -> Self {
        Self::TooManyRequests {
            code,
            message,
            request_id: Some(request_id),
            limit,
            policy,
            retry_after_seconds,
            window_seconds,
            with_payment_method,
        }
    }

    pub fn too_many_requests_with_policy(
        code: Option<String>,
        message: Option<String>,
        request_id: Option<String>,
        limit: i64,
        policy: TooManyRequestsEncodedPolicy,
        retry_after_seconds: i64,
        window_seconds: i64,
        with_payment_method: Option<i64>,
    ) -> Self {
        Self::TooManyRequests {
            code,
            message,
            request_id,
            limit,
            policy: Some(policy),
            retry_after_seconds,
            window_seconds,
            with_payment_method,
        }
    }

    pub fn too_many_requests_with_with_payment_method(
        code: Option<String>,
        message: Option<String>,
        request_id: Option<String>,
        limit: i64,
        policy: Option<TooManyRequestsEncodedPolicy>,
        retry_after_seconds: i64,
        window_seconds: i64,
        with_payment_method: i64,
    ) -> Self {
        Self::TooManyRequests {
            code,
            message,
            request_id,
            limit,
            policy,
            retry_after_seconds,
            window_seconds,
            with_payment_method: Some(with_payment_method),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
