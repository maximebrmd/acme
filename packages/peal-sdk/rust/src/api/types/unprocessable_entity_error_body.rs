pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    UnsupportedMediaType {
        #[serde(rename = "contentType")]
        #[serde(default)]
        content_type: String,
    },

    #[non_exhaustive]
    MediaTooLarge {
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
        #[serde(rename = "maxLength")]
        #[serde(default)]
        max_length: i64,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn unsupported_media_type(content_type: String) -> Self {
        Self::UnsupportedMediaType { content_type }
    }

    pub fn media_too_large(
        byte_size: i64,
        kind: MediaTooLargeEncodedKind,
        max_byte_size: i64,
    ) -> Self {
        Self::MediaTooLarge {
            byte_size,
            kind,
            max_byte_size,
        }
    }

    pub fn alt_text_too_long(max_length: i64) -> Self {
        Self::AltTextTooLong { max_length }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
