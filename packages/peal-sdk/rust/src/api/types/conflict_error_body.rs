pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    AlreadyMember {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    TooManyInvitations {
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

impl ConflictErrorBody {
    pub fn already_member() -> Self {
        Self::AlreadyMember {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn too_many_invitations() -> Self {
        Self::TooManyInvitations {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn already_member_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::AlreadyMember {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn already_member_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::AlreadyMember {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn already_member_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::AlreadyMember {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn too_many_invitations_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::TooManyInvitations {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn too_many_invitations_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::TooManyInvitations {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn too_many_invitations_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::TooManyInvitations {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
