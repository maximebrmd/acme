pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum BadGatewayErrorBody {
    #[non_exhaustive]
    TextProviderRefused {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: TextProviderRefusedEncodedReason,
        #[serde(skip_serializing_if = "Option::is_none")]
        status: Option<i64>,
    },

    #[non_exhaustive]
    AssistantFailed {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: AssistantFailedEncodedReason,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl BadGatewayErrorBody {
    pub fn text_provider_refused(reason: TextProviderRefusedEncodedReason) -> Self {
        Self::TextProviderRefused {
            code: None,
            message: None,
            request_id: None,
            reason,
            status: None,
        }
    }

    pub fn assistant_failed(reason: AssistantFailedEncodedReason) -> Self {
        Self::AssistantFailed {
            code: None,
            message: None,
            request_id: None,
            reason,
        }
    }

    pub fn text_provider_refused_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: TextProviderRefusedEncodedReason,
        status: Option<i64>,
    ) -> Self {
        Self::TextProviderRefused {
            code: Some(code),
            message,
            request_id,
            reason,
            status,
        }
    }

    pub fn text_provider_refused_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: TextProviderRefusedEncodedReason,
        status: Option<i64>,
    ) -> Self {
        Self::TextProviderRefused {
            code,
            message: Some(message),
            request_id,
            reason,
            status,
        }
    }

    pub fn text_provider_refused_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: TextProviderRefusedEncodedReason,
        status: Option<i64>,
    ) -> Self {
        Self::TextProviderRefused {
            code,
            message,
            request_id: Some(request_id),
            reason,
            status,
        }
    }

    pub fn text_provider_refused_with_status(
        code: Option<String>,
        message: Option<String>,
        request_id: Option<String>,
        reason: TextProviderRefusedEncodedReason,
        status: i64,
    ) -> Self {
        Self::TextProviderRefused {
            code,
            message,
            request_id,
            reason,
            status: Some(status),
        }
    }

    pub fn assistant_failed_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: AssistantFailedEncodedReason,
    ) -> Self {
        Self::AssistantFailed {
            code: Some(code),
            message,
            request_id,
            reason,
        }
    }

    pub fn assistant_failed_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: AssistantFailedEncodedReason,
    ) -> Self {
        Self::AssistantFailed {
            code,
            message: Some(message),
            request_id,
            reason,
        }
    }

    pub fn assistant_failed_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: AssistantFailedEncodedReason,
    ) -> Self {
        Self::AssistantFailed {
            code,
            message,
            request_id: Some(request_id),
            reason,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
