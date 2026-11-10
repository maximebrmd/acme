pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ForbiddenErrorBody {
    #[non_exhaustive]
    Forbidden {
        #[serde(flatten)]
        data: ForbiddenEncoded,
    },

    #[non_exhaustive]
    PartnerAccountsClosed {
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

impl ForbiddenErrorBody {
    pub fn forbidden(data: ForbiddenEncoded) -> Self {
        Self::Forbidden { data }
    }

    pub fn partner_accounts_closed() -> Self {
        Self::PartnerAccountsClosed {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn partner_accounts_closed_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::PartnerAccountsClosed {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn partner_accounts_closed_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::PartnerAccountsClosed {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn partner_accounts_closed_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::PartnerAccountsClosed {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
