pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    UnsupportedMediaType {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "contentType")]
        #[serde(default)]
        content_type: String,
    },

    #[non_exhaustive]
    MediaTooLarge {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "byteSize")]
        #[serde(default)]
        byte_size: i64,
        kind: MediaTooLargeEncodedKind,
        #[serde(rename = "maxByteSize")]
        #[serde(default)]
        max_byte_size: i64,
    },

    #[non_exhaustive]
    AltTextTooLong {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "maxLength")]
        #[serde(default)]
        max_length: i64,
    },

    #[non_exhaustive]
    MediaSourceNotPublic {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    MediaSourceUnreachable {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: MediaSourceFailure,
        #[serde(skip_serializing_if = "Option::is_none")]
        status: Option<i64>,
    },

    #[non_exhaustive]
    UploadRejected {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: RejectionReason,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn unsupported_media_type(content_type: String) -> Self {
        Self::UnsupportedMediaType {
            code: None,
            message: None,
            request_id: None,
            content_type,
        }
    }

    pub fn media_too_large(
        byte_size: i64,
        kind: MediaTooLargeEncodedKind,
        max_byte_size: i64,
    ) -> Self {
        Self::MediaTooLarge {
            code: None,
            message: None,
            request_id: None,
            byte_size,
            kind,
            max_byte_size,
        }
    }

    pub fn alt_text_too_long(max_length: i64) -> Self {
        Self::AltTextTooLong {
            code: None,
            message: None,
            request_id: None,
            max_length,
        }
    }

    pub fn media_source_not_public() -> Self {
        Self::MediaSourceNotPublic {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn media_source_unreachable(reason: MediaSourceFailure) -> Self {
        Self::MediaSourceUnreachable {
            code: None,
            message: None,
            request_id: None,
            reason,
            status: None,
        }
    }

    pub fn upload_rejected(reason: RejectionReason) -> Self {
        Self::UploadRejected {
            code: None,
            message: None,
            request_id: None,
            reason,
        }
    }

    pub fn unsupported_media_type_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        content_type: String,
    ) -> Self {
        Self::UnsupportedMediaType {
            code: Some(code),
            message,
            request_id,
            content_type,
        }
    }

    pub fn unsupported_media_type_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        content_type: String,
    ) -> Self {
        Self::UnsupportedMediaType {
            code,
            message: Some(message),
            request_id,
            content_type,
        }
    }

    pub fn unsupported_media_type_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        content_type: String,
    ) -> Self {
        Self::UnsupportedMediaType {
            code,
            message,
            request_id: Some(request_id),
            content_type,
        }
    }

    pub fn media_too_large_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        byte_size: i64,
        kind: MediaTooLargeEncodedKind,
        max_byte_size: i64,
    ) -> Self {
        Self::MediaTooLarge {
            code: Some(code),
            message,
            request_id,
            byte_size,
            kind,
            max_byte_size,
        }
    }

    pub fn media_too_large_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        byte_size: i64,
        kind: MediaTooLargeEncodedKind,
        max_byte_size: i64,
    ) -> Self {
        Self::MediaTooLarge {
            code,
            message: Some(message),
            request_id,
            byte_size,
            kind,
            max_byte_size,
        }
    }

    pub fn media_too_large_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        byte_size: i64,
        kind: MediaTooLargeEncodedKind,
        max_byte_size: i64,
    ) -> Self {
        Self::MediaTooLarge {
            code,
            message,
            request_id: Some(request_id),
            byte_size,
            kind,
            max_byte_size,
        }
    }

    pub fn alt_text_too_long_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        max_length: i64,
    ) -> Self {
        Self::AltTextTooLong {
            code: Some(code),
            message,
            request_id,
            max_length,
        }
    }

    pub fn alt_text_too_long_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        max_length: i64,
    ) -> Self {
        Self::AltTextTooLong {
            code,
            message: Some(message),
            request_id,
            max_length,
        }
    }

    pub fn alt_text_too_long_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        max_length: i64,
    ) -> Self {
        Self::AltTextTooLong {
            code,
            message,
            request_id: Some(request_id),
            max_length,
        }
    }

    pub fn media_source_not_public_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::MediaSourceNotPublic {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn media_source_not_public_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::MediaSourceNotPublic {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn media_source_not_public_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::MediaSourceNotPublic {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn media_source_unreachable_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: MediaSourceFailure,
        status: Option<i64>,
    ) -> Self {
        Self::MediaSourceUnreachable {
            code: Some(code),
            message,
            request_id,
            reason,
            status,
        }
    }

    pub fn media_source_unreachable_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: MediaSourceFailure,
        status: Option<i64>,
    ) -> Self {
        Self::MediaSourceUnreachable {
            code,
            message: Some(message),
            request_id,
            reason,
            status,
        }
    }

    pub fn media_source_unreachable_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: MediaSourceFailure,
        status: Option<i64>,
    ) -> Self {
        Self::MediaSourceUnreachable {
            code,
            message,
            request_id: Some(request_id),
            reason,
            status,
        }
    }

    pub fn media_source_unreachable_with_status(
        code: Option<String>,
        message: Option<String>,
        request_id: Option<String>,
        reason: MediaSourceFailure,
        status: i64,
    ) -> Self {
        Self::MediaSourceUnreachable {
            code,
            message,
            request_id,
            reason,
            status: Some(status),
        }
    }

    pub fn upload_rejected_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: RejectionReason,
    ) -> Self {
        Self::UploadRejected {
            code: Some(code),
            message,
            request_id,
            reason,
        }
    }

    pub fn upload_rejected_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: RejectionReason,
    ) -> Self {
        Self::UploadRejected {
            code,
            message: Some(message),
            request_id,
            reason,
        }
    }

    pub fn upload_rejected_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: RejectionReason,
    ) -> Self {
        Self::UploadRejected {
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
