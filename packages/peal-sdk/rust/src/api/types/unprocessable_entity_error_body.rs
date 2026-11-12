pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    RecyclingEndsTooSoon {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "firstDueAt")]
        #[serde(default)]
        first_due_at: String,
    },

    #[non_exhaustive]
    RecyclingVariantsInvalid {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        variants: Vec<RecyclingVariantsInvalidEncodedVariantsItem>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn recycling_ends_too_soon(first_due_at: String) -> Self {
        Self::RecyclingEndsTooSoon {
            code: None,
            message: None,
            request_id: None,
            first_due_at,
        }
    }

    pub fn recycling_variants_invalid(
        variants: Vec<RecyclingVariantsInvalidEncodedVariantsItem>,
    ) -> Self {
        Self::RecyclingVariantsInvalid {
            code: None,
            message: None,
            request_id: None,
            variants,
        }
    }

    pub fn recycling_ends_too_soon_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        first_due_at: String,
    ) -> Self {
        Self::RecyclingEndsTooSoon {
            code: Some(code),
            message,
            request_id,
            first_due_at,
        }
    }

    pub fn recycling_ends_too_soon_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        first_due_at: String,
    ) -> Self {
        Self::RecyclingEndsTooSoon {
            code,
            message: Some(message),
            request_id,
            first_due_at,
        }
    }

    pub fn recycling_ends_too_soon_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        first_due_at: String,
    ) -> Self {
        Self::RecyclingEndsTooSoon {
            code,
            message,
            request_id: Some(request_id),
            first_due_at,
        }
    }

    pub fn recycling_variants_invalid_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        variants: Vec<RecyclingVariantsInvalidEncodedVariantsItem>,
    ) -> Self {
        Self::RecyclingVariantsInvalid {
            code: Some(code),
            message,
            request_id,
            variants,
        }
    }

    pub fn recycling_variants_invalid_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        variants: Vec<RecyclingVariantsInvalidEncodedVariantsItem>,
    ) -> Self {
        Self::RecyclingVariantsInvalid {
            code,
            message: Some(message),
            request_id,
            variants,
        }
    }

    pub fn recycling_variants_invalid_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        variants: Vec<RecyclingVariantsInvalidEncodedVariantsItem>,
    ) -> Self {
        Self::RecyclingVariantsInvalid {
            code,
            message,
            request_id: Some(request_id),
            variants,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
