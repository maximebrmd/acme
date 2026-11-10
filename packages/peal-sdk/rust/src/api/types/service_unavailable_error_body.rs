pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ServiceUnavailableErrorBody {
    #[non_exhaustive]
    BillingUnavailable {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "workspaceId")]
        #[serde(default)]
        workspace_id: String,
    },

    #[non_exhaustive]
    MediaStoreUnavailable {
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

impl ServiceUnavailableErrorBody {
    pub fn billing_unavailable(workspace_id: String) -> Self {
        Self::BillingUnavailable {
            code: None,
            message: None,
            request_id: None,
            workspace_id,
        }
    }

    pub fn media_store_unavailable() -> Self {
        Self::MediaStoreUnavailable {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn billing_unavailable_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        workspace_id: String,
    ) -> Self {
        Self::BillingUnavailable {
            code: Some(code),
            message,
            request_id,
            workspace_id,
        }
    }

    pub fn billing_unavailable_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        workspace_id: String,
    ) -> Self {
        Self::BillingUnavailable {
            code,
            message: Some(message),
            request_id,
            workspace_id,
        }
    }

    pub fn billing_unavailable_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        workspace_id: String,
    ) -> Self {
        Self::BillingUnavailable {
            code,
            message,
            request_id: Some(request_id),
            workspace_id,
        }
    }

    pub fn media_store_unavailable_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::MediaStoreUnavailable {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn media_store_unavailable_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::MediaStoreUnavailable {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn media_store_unavailable_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::MediaStoreUnavailable {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
