pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum NotFoundErrorBody {
    #[non_exhaustive]
    WebhookEndpointNotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    WebhookDeliveryNotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    WorkspaceNotFound {
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

impl NotFoundErrorBody {
    pub fn webhook_endpoint_not_found() -> Self {
        Self::WebhookEndpointNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn webhook_delivery_not_found() -> Self {
        Self::WebhookDeliveryNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn workspace_not_found() -> Self {
        Self::WorkspaceNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn webhook_endpoint_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::WebhookEndpointNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn webhook_endpoint_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::WebhookEndpointNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn webhook_endpoint_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::WebhookEndpointNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn webhook_delivery_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::WebhookDeliveryNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn webhook_delivery_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::WebhookDeliveryNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn webhook_delivery_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::WebhookDeliveryNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn workspace_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::WorkspaceNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn workspace_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::WorkspaceNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn workspace_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::WorkspaceNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
