pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    QueueNameTaken {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    TooManyQueues {
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

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ConflictErrorBody {
    pub fn queue_name_taken() -> Self {
        Self::QueueNameTaken {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn too_many_queues(allowed: i64) -> Self {
        Self::TooManyQueues {
            code: None,
            message: None,
            request_id: None,
            allowed,
        }
    }

    pub fn queue_name_taken_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::QueueNameTaken {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn queue_name_taken_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::QueueNameTaken {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn queue_name_taken_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::QueueNameTaken {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn too_many_queues_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyQueues {
            code: Some(code),
            message,
            request_id,
            allowed,
        }
    }

    pub fn too_many_queues_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyQueues {
            code,
            message: Some(message),
            request_id,
            allowed,
        }
    }

    pub fn too_many_queues_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        allowed: i64,
    ) -> Self {
        Self::TooManyQueues {
            code,
            message,
            request_id: Some(request_id),
            allowed,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
