pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UploadTarget {
    #[serde(rename = "single")]
    #[non_exhaustive]
    Single {
        #[serde(rename = "expiresAt")]
        #[serde(default)]
        expires_at: String,
        request: SignedRequest,
    },

    #[serde(rename = "multipart")]
    #[non_exhaustive]
    Multipart {
        #[serde(rename = "expiresAt")]
        #[serde(default)]
        expires_at: String,
        #[serde(rename = "partSize")]
        #[serde(default)]
        part_size: i64,
        #[serde(default)]
        parts: Vec<UploadPart>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UploadTarget {
    pub fn single(expires_at: String, request: SignedRequest) -> Self {
        Self::Single {
            expires_at,
            request,
        }
    }

    pub fn multipart(expires_at: String, part_size: i64, parts: Vec<UploadPart>) -> Self {
        Self::Multipart {
            expires_at,
            part_size,
            parts,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
